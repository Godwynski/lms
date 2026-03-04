## LMS System Analysis & Fix Plan

### 1. Overview

- **Stack**: Next.js App Router (React 19) with Supabase (Postgres, auth, storage).
- **Main domains**: Borrower (dashboard, catalog, reading lists, borrowings), Staff/Admin (books CRUD, users, checkout/returns, approvals, audit, theses, data exports).
- **Server logic**: Next server actions and route handlers under `src/app/**/actions.ts` and `src/app/**/route.ts`.
- **Auth**: Global middleware and Supabase helpers gate `/admin` and check roles via `profiles.role`.
- **Testing**: No automated tests currently present.

### 2. Findings by Severity

#### 2.1 High Severity

1. **Book catalog mutations missing role checks**
   - **Files**: `src/utils/api/isbn-service.ts` (`addBookToCatalog`, `updateBook`, `deleteBook`).
   - **Issue**: Only check for authenticated user; do not enforce staff/admin roles.
   - **Risk**: Any borrower can add/edit/delete books and adjust copy counts.

2. **Reading list item operations don’t enforce ownership**
   - **Files**: `src/app/catalog/readingListActions.ts` (`addToReadingList`, `removeFromReadingList`).
   - **Issue**: Only require authentication; do not verify that `listId` belongs to the current user.
   - **Risk**: Users can modify other users’ reading lists (horizontal privilege escalation).

3. **Admin audit ISBN lookup exposed to all authenticated users**
   - **Files**: `src/app/admin/audit/actions.ts` (`lookupBookByISBN`).
   - **Issue**: Checks only that a user exists; no staff role check.
   - **Risk**: Borrowers can access functions intended for staff audit tools.

#### 2.2 Medium Severity

4. **Possible crash on missing ISBN in admin borrowings**
   - **Files**: `src/app/admin/borrowings/BorrowingsClient.tsx`.
   - **Issue**: Calls `r.books?.isbn.includes(q)` without guarding for null/undefined `isbn`.

5. **Cover image field inconsistency**
   - **Files**:
     - `src/app/admin/checkout/actions.ts` (`lookupOrAddBook`) writes `cover_url`.
     - UI components and exports read `cover_image_url`.
   - **Issue**: Different columns used for the same concept; some books appear to have no cover.

6. **Non-atomic availability updates in approvals**
   - **Files**: `src/app/admin/approvals/actions.ts` (`rejectRequest`, `approveReturnRequest`).
   - **Issue**: Status updates and availability increments are performed in separate steps with manual read–modify–write fallbacks.

7. **Auth flows leak raw error messages and lack validation**
   - **Files**: `src/app/login/actions.ts`.
   - **Issue**: Redirects with raw `error.message` in query params; minimal server-side email/password validation.

#### 2.3 Low Severity / Architectural Gaps

8. **Time-dependent logic fixed at module-load time**
   - **Files**: `src/app/admin/borrowings/BorrowingsClient.tsx` (`MODULE_LOAD_TIME = Date.now()`).

9. **Dashboard & catalog stats not scalable / misleading**
   - **Files**: `src/app/page.tsx`, `src/app/catalog/page.tsx`.

10. **No automated tests for critical flows**
    - **Files**: Whole repo (no tests found).

11. **CSV export formula-injection risk**
    - **Files**: `src/app/admin/data-hub/export/books/route.ts`, `src/app/admin/data-hub/export/borrowings/route.ts`.

12. **RBAC duplication and minor nits**
    - **Files**: Multiple `middleware.ts`, `admin/*/actions.ts`, `isbn-service.ts`, etc.

---

### 3. Fix Plan (Prioritized)

#### Phase 1 – Critical Security & Data Integrity (High Priority)

1. **Centralize role and RBAC helpers**
   - Create `src/utils/auth/roles.ts` with shared role constants (`BORROWER_ROLES`, `STAFF_ROLES`, `ADMIN_ROLES`) and helpers (`requireStaff`, `requireAdmin`).
   - Refactor existing role checks in `middleware.ts`, `admin/*/actions.ts`, and `admin/theses/actions.ts` to use these helpers.

2. **Lock down catalog mutations**
   - Update `src/utils/api/isbn-service.ts`:
     - Call `requireStaff` at the start of `addBookToCatalog`, `updateBook`, and `deleteBook`.
     - Add tests or at least manual checks to confirm borrowers receive a 403-style error.

3. **Enforce reading list ownership**
   - Update `src/app/catalog/readingListActions.ts`:
     - Before modifying `reading_list_books`, verify `reading_lists.id = listId AND user_id = user.id`.
   - In Supabase:
     - Add/adjust RLS on `reading_list_books` to ensure only the owner of the parent list can add/remove items.

4. **Restrict audit ISBN lookup to staff**
   - Update `src/app/admin/audit/actions.ts`:
     - Reuse `requireStaff` or the same logic as `getAllBooksForAudit` at the start of `lookupBookByISBN`.

#### Phase 2 – Correctness & UX (Medium Priority)

5. **Fix admin borrowings ISBN filter**
   - Update `BorrowingsClient.tsx` search filter:
     - Use null-safe checks (`r.books?.isbn?.toLowerCase().includes(q)`).
   - Add a simple unit/regression test or manual QA scenario with missing ISBN.

6. **Standardize cover image field**
   - Decide on canonical column name (likely `cover_image_url`).
   - Update `lookupOrAddBook` in `admin/checkout/actions.ts` to write `cover_image_url`.
   - Add one-off migration/script to copy any existing `cover_url` values into `cover_image_url`.
   - Update CSV exports if necessary to use the canonical field.

7. **Make availability updates atomic in approvals**
   - Create new Postgres RPC(s), e.g.:
     - `atomic_reject_request(record_id)` and `atomic_approve_return_request(record_id)`.
   - Each RPC should:
     - Validate the current status.
     - Update `borrowing_records.status`.
     - Adjust `available_copies` in a single transaction.
   - Update `admin/approvals/actions.ts` to call these RPCs and remove manual fallback logic.

8. **Harden auth flows**
   - Add server-side validation for email/password in `login/actions.ts`.
   - Replace raw `error.message` in redirects with mapped, user-safe codes/messages.

#### Phase 3 – Scalability, DX, and Safety (Lower Priority)

9. **Improve time-dependent status calculation**
   - In `BorrowingsClient.tsx`, replace `MODULE_LOAD_TIME` with:
     - `const nowMs = Date.now()` per render; or
     - A stateful `now` updated via `setInterval` (e.g., every 60s) if more precision is needed.

10. **Optimize dashboard & catalog stats**
    - Replace full-table fetches in `page.tsx` with aggregate queries or Supabase RPCs that compute counts/sums in the DB.
    - In `catalog/page.tsx`, use Supabase `count` for the “browse and search X books” text instead of `books.length`.

11. **Introduce tests for critical flows**
    - Set up a basic test harness (e.g., Vitest/Jest + Playwright or integration tests against a test Supabase project).
    - Start with:
      - Checkout/return/approval invariants.
      - RBAC boundaries (borrower vs staff).
      - Catalog CRUD via `isbn-service.ts`.

12. **Harden CSV exports against formula injection**
    - In both CSV export routes:
      - Enhance the `escape` function so that any field starting with `=`, `+`, `-`, or `@` is prefixed with `'`.

13. **Reduce RBAC duplication and minor cleanups**
    - After introducing shared role helpers, simplify each `admin/*/actions.ts` file.
    - Add optional logging for key RPC failures (e.g., `atomic_checkout`, `increment_available_copies`) to improve observability.

---

### 4. Suggested Execution Order

1. Implement shared RBAC helpers and lock down catalog, reading list, and audit actions (Phase 1).
2. Fix correctness bugs (ISBN filter, cover image field, atomic approvals) and auth error handling (Phase 2).
3. Add tests and scalability improvements, then CSV hardening and refactors (Phase 3).

