# STI College Alabang — Library Management System (LMS)
> **Documentation v2.0** | Last Updated: March 2026

---

## 1. System Overview

A web-based Library Management System for STI College Alabang, providing a mobile-first, role-aware portal for book cataloging, checkout/return management, and library card administration. Built on a modern serverless stack with PostgreSQL-backed data integrity and RLS-enforced security.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router, Server Components, Server Actions) |
| **UI** | Vanilla CSS + Tailwind utility classes, Lucide Icons |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| **Image Processing** | `sharp` — server-side cover compression & WebP conversion |
| **Auth** | Supabase Auth (Email/Password + Microsoft 365 SSO) |
| **Deployment** | Vercel-ready, Node.js runtime |

---

## 3. Database Schema

### Tables

| Table | Purpose |
|---|---|
| `auth.users` | Supabase-managed auth accounts |
| `public.profiles` | Extended user info: `full_name`, `role`, `library_card_qr` |
| `public.books` | Book catalog with MARC 21-aligned fields + DDC call number |
| `public.copies` | Physical copies of books with status tracking (available, borrowed, etc.) |
| `public.borrowing_records` | Checkout/return transactions, status, due dates |
| `public.audit_logs` | Admin action audit trail — INSERT/UPDATE/DELETE on key tables |

### Key Relationships
- `profiles.id → auth.users.id` (ON DELETE CASCADE)
- `borrowing_records.book_id → books.id`
- `borrowing_records.borrower_id → auth.users.id`
- `copies.book_id → books.id` (ON DELETE CASCADE)

### Roles (ENUM: `user_role`)
- `super_admin` — Full system control
- `librarian` — Catalog + user management
- `circulation_assistant` — Checkout/return operations
- `borrower` — Standard student access

### Automation / Triggers
- **`on_auth_user_created`** — Automatically creates a `public.profiles` row for every new `auth.users` registration (role defaults to `borrower`).
- **`update_profiles_modtime` / `update_books_modtime` / `update_copies_modtime`** — Auto-updates `updated_at` timestamps on row changes.
- **`books_audit` / `copies_audit` / `profiles_audit`** — Logs all mutations to `audit_logs`.
- **`atomic_checkout(borrower_id, book_id)`** — Stored procedure that safely decrements `available_copies` and creates a borrowing record atomically.

### Row Level Security (RLS)
| Table | Policy |
|---|---|
| `books` | Public SELECT; INSERT/UPDATE/DELETE requires `is_staff()` |
| `copies` | Public SELECT; INSERT/UPDATE/DELETE requires `is_staff()` |
| `profiles` | Users can SELECT their own row; admin updates via service role |
| `borrowing_records` | Managed by server actions using service role |

---

## 4. Implemented Modules

### ✅ Authentication
- Email/Password login via Supabase Auth
- Microsoft 365 SSO (OAuth callback implemented)
- Email-based self-registration (role defaults to `borrower`)
- Admin-created accounts via Service Role Key (role assigned at creation)
- Server-side session validation on all protected routes

### ✅ Role-Aware Dashboard (`/`)
- **Logged Out:** Landing page with feature highlights + Login/Register CTA
- **Super Admin / Librarian:** 6-metric stats grid (titles, available, checked out, overdue, active loans, borrowers), alert banners for overdue items, quick actions, recent borrowings feed
- **Circulation Assistant:** Stats grid, quick actions (Checkout, Catalog)
- **Borrower:** Active borrowings cards with cover image + due date countdown, due-soon alert banner, catalog shortcut

### ✅ Book Catalog (`/catalog`)
- Full-text search using PostgreSQL `tsvector` index
- Book cards with cover image, author, availability badge

### ✅ Admin Inventory (`/admin/books`)
- Inventory table with all books + available/total copies
- **Add Book:** ISBN lookup via Google Books API → Open Library fallback; camera barcode scanner; form pre-fill; cover image downloaded, compressed (WebP via `sharp`), uploaded to Supabase Storage
- **Edit Book:** Pre-filled modal for all book fields; enforces total_copies ≥ checked-out copies
- **Delete Book:** Confirmation modal; blocks deletion if copies are currently borrowed
> Access: `super_admin`, `librarian`, `circulation_assistant`

### ✅ Checkout & Return (`/admin/checkout`)
- Scan borrower's Library Card QR + Book QR/barcode
- Processes checkout via `atomic_checkout()` stored procedure
- Return flow updates `borrowing_records.status` and increments `available_copies`
> Access: `super_admin`, `librarian`, `circulation_assistant`

### ✅ User Management (`/admin/users`)
- Lists **all auth users** (fetched via Admin API, merged with profiles)
- Shows: Name, Email, Last Sign-In Date, Role badge
- Admin can create users (any role, password set directly)
- Admin can update roles via modal
- Admin can permanently delete users
> Access: `super_admin`, `librarian`

---

## 5. Development Roadmap

### 🔲 Phase 1 — Borrower OPAC (Student Portal)
1. **Advanced Search & Facets:** Search by Title, Author, Subject, DDC, or Call Number. Filter results dynamically (e.g., by Year, Category, Availability).
2. **Virtual Shelves / Reading Lists:** Allow students to save books they want to read later into custom lists.
3. **Student Borrowings Page:** Dedicated page for full borrowing history (active + returned) — not just the dashboard widget.
4. **Digital Library Card:** A unique, automatically generated QR code accessible on the student's dashboard (which can also be printed) used as their primary identification during physical checkouts.
5. **Book Reviews & Ratings:** Allow students to leave ratings and public reviews for books they've read.
6. **SSO Login:** Complete Microsoft 365 login integration for seamless student access.
7. **Mobile PWA Enhancements:** Implement prompts encouraging students to "Add to Home Screen" to solidify the mobile-first experience.

### 🔲 Phase 2 — Reservations System
1. **Rapid Checkout Flow Enhancement:** Further streamline the QR scan → checkout → confirmation flow for circulation staff.
2. **Reservation System (Student):** Interface to place book reservations online when copies are unavailable.
3. **Waitlists (Student):** Opt-in to be notified when an unavailable book is returned.
4. **Reservation Queue (Admin):** Interface to approve, prepare, and monitor pending reservations.

### 🔲 Phase 3 — Fine Management & Notifications
1. **Fine Management:** Calculate and display penalties for overdue books. Admin-configurable fine rate per day via Circulation Rules.
2. **Fine Payment Tracking:** Record when fines are paid and generate receipt slips.
3. **Automated Email Notifications:** System automatically dispatches emails to students for:
   - Upcoming due dates (3-day warning)
   - Overdue notices
   - Reservation availability
4. **Notification Template Editor:** Admins can edit the text templates for automated email notices.
5. **Circulation Rules Engine:** Admin settings to define global borrowing policies (e.g., maximum books per student, specific loan periods per category).
6. **User Message Center:** A messaging system allowing librarians to send direct alerts to specific student OPAC dashboards.

### 🔲 Phase 4 — Offline Resilience (PWA)
1. **PWA Integration:** Cache application shells (HTML/CSS/JS) using Service Workers for uninterrupted offline loading.
2. **Offline Transaction Queue:** Since administration logic is centralized to a single physical computer, the offline strategy focuses on queuing local actions (checkouts/returns) in IndexedDB when the internet drops.
3. **Reconnection Sync:** Automatically push queued transactions to Supabase upon reconnection. Conflicts (e.g., a student reserving a book online while the admin processes a physical checkout offline) are handled by prioritizing the physical checkout event via server timestamps.
4. **Physical Copy Management (QR Generation):** Generate and print unique QR codes to be affixed to each physical copy of a title, enabling lightning-fast scanning during checkouts and returns.

### 🔲 Phase 5 — Analytics, Reporting & Polish
1. **Analytics Dashboard:** Admin view for borrowing trends, popular titles, peak checkout times, and user activity.
2. **Exportable Reports:** CSV/PDF export for ad-hoc audit reports.
3. **Lost/Damaged Tracking:** Specific status updates for copies that are lost, damaged, or retired from circulation.
4. **Print Formatting:** `@media print` stylesheets and thermal receipt views (fine receipts, checkout slips).
5. **Data Privacy Compliance:** Automated anonymization scripts or deletion policies for old transaction records to comply with the Philippine Data Privacy Act of 2012.
6. **Hardware Barcode Support:** Ensure all input fields and search interfaces auto-submit on 1D barcode scanner input (hardware wedge scanners common in libraries).

---

## 6. File Structure (Key Paths)

```
src/
  app/
    page.tsx                    # Role-aware dashboard
    login/
      page.tsx                  # Login UI
      actions.ts                # signIn / signUp / Microsoft SSO
    register/
      page.tsx                  # Public self-registration
    catalog/
      page.tsx                  # Book search & browse
    admin/
      books/
        page.tsx                # Inventory table
        AddBookModal.tsx        # ISBN scan + add flow
        EditBookModal.tsx       # Edit existing book
        DeleteBookButton.tsx    # Delete with confirmation
        actions.ts              # addBook / updateBook / deleteBook
      checkout/
        page.tsx                # Checkout/return UI
        actions.ts              # Checkout + return server actions
      users/
        page.tsx                # User list (admin API)
        UsersClient.tsx         # User management UI
        actions.ts              # createUser / updateRole / deleteUser
  components/
    QRScanner.tsx               # Camera barcode/QR scanner
  utils/
    supabase/
      client.ts                 # Browser Supabase client
      server.ts                 # Server Supabase client
    isbn.ts                     # ISBN-10/13 normalization
supabase/
  schema.sql                    # Initial database schema
  atomic_checkout.sql           # Checkout stored procedure
  atomic_return.sql             # Return stored procedure
  add_profile_trigger_and_rls.sql  # Profile automation + book RLS
```

---

## 7. Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only, admin operations) |
| `GOOGLE_BOOKS_API_KEY` | Optional — Google Books API key for ISBN lookups |

---

## 8. Digital Library Card — Design Specification

> **Status:** Planned (Phase 1) | **Access:** Borrowers (Students)

The Digital Library Card is the student's primary identification during physical checkouts. It replaces the need for a physical card by displaying a scannable QR code on the student's phone, and also supports manual lookup via student number as a fallback.

---

### 8.1 Identification Methods

Two methods are supported to identify a borrower at the circulation desk:

| Method | How it works | When to use |
|---|---|---|
| **QR Code Scan** | Staff scans the QR on the student's phone/printout using the checkout interface camera | Primary method — fast, no typing required |
| **Student Number Lookup** | Staff types the student number into a search field | Fallback — when phone is dead, forgotten, or QR won't scan |

---

### 8.2 Data Model Changes

The `profiles` table needs two new columns:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_number VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS library_card_qr TEXT; -- base64 or URL of the generated QR image
```

**`student_number`** — the official STI student ID (e.g., `2024-0001-MNL`). Set by admin when creating the account, or entered during self-registration. Must be unique.

**`library_card_qr`** — the QR code content (the encoded string). The actual QR image is rendered on the frontend using a library like `qrcode.react`. No need to store an image — just store the payload string.

**QR Payload format:**
```
STICAL-LMS:USER:{user_id}:{student_number}
```
Example: `STICAL-LMS:USER:f47ac10b-58cc-4372-a567-0e02b2c3d479:2024-0001-MNL`

Using a prefixed format prevents accidental collisions with book QR scans and allows the checkout scanner to detect what type of QR was scanned.

---

### 8.3 Student View — Library Card Dashboard Widget

On the borrower dashboard (`/`), a **Library Card card** is displayed:

```
┌─────────────────────────────────────┐
│  STI College Alabang                │
│  Library Card                       │
│                                     │
│  ████████████████████               │
│  ██  QR CODE HERE  ██               │
│  ████████████████████               │
│                                     │
│  Juan Dela Cruz                     │
│  Student No: 2024-0001-MNL          │
│                                     │
│  [ Download / Print ]               │
└─────────────────────────────────────┘
```

- QR is rendered client-side using `qrcode.react` (no server image needed)
- "Download / Print" button generates a print-friendly version of the card
- Card is only shown to users with role = `borrower`

---

### 8.4 Checkout Flow Using the Library Card

**Using QR scan (primary):**
1. Staff opens `/admin/checkout`
2. Staff clicks **"Scan Borrower Card"**
3. Camera activates — student shows QR on phone
4. System parses the QR payload: `STICAL-LMS:USER:{user_id}:{student_number}`
5. System fetches the borrower's profile and displays their name + active loans
6. Staff proceeds to scan the **book QR** to complete checkout

**Using Student Number (fallback):**
1. Staff opens `/admin/checkout`
2. Staff types or pastes the student number into a search field
3. System looks up `profiles` by `student_number` and returns the match
4. Same flow continues from step 5 above

---

### 8.5 Checkout Scanner — QR Type Detection

The checkout scanner must distinguish between two QR types:

```typescript
function parseCheckoutScan(raw: string) {
  if (raw.startsWith('STICAL-LMS:USER:')) {
    // Borrower library card
    const parts = raw.split(':')
    return { type: 'borrower', userId: parts[2], studentNumber: parts[3] }
  }
  if (raw.startsWith('STICAL-LMS:BOOK:')) {
    // Physical book copy QR
    const parts = raw.split(':')
    return { type: 'book', copyId: parts[2] }
  }
  // Legacy: treat as ISBN barcode
  return { type: 'isbn', value: raw }
}
```

The checkout UI uses this to automatically know whether a scan is identifying the borrower or the book, making the flow fully automatic without staff needing to switch modes.

---

### 8.6 Admin — Setting Student Numbers

When creating or editing a user in `/admin/users`, the admin should be able to set the `student_number` field. This is especially important for:
- Students who self-registered (they may not know to enter their number)
- Bulk imports of new students each academic year

---

### 8.7 Edge Cases

| Scenario | Handling |
|---|---|
| Student doesn't have a student number set | Library card shows QR only (using `user_id`). Manual lookup by name is offered as fallback. |
| Two students with same student number | Prevented by `UNIQUE` constraint on `student_number` column |
| QR is damaged or phone screen too dim | Staff falls back to student number or name search |
| Student not registered in system | Staff creates a new account via User Management, assigns student number |
| Student's account is suspended/inactive | Checkout action blocked with a visible error message |

---

### 8.8 Implementation Plan

| Step | Task | Files Affected |
|---|---|---|
| 1 | Add `student_number` column to `profiles` table | `schema.sql` + migration |
| 2 | Add student number field to User Create/Edit modals in `/admin/users` | `UsersClient.tsx`, `actions.ts` |
| 3 | Add student number input to self-registration form | `register/page.tsx` |
| 4 | Install `qrcode.react` (`npm i qrcode.react`) | — |
| 5 | Build `LibraryCard.tsx` component | `src/components/LibraryCard.tsx` |
| 6 | Add Library Card widget to borrower dashboard | `src/app/page.tsx` |
| 7 | Update checkout scanner to parse QR type | `src/app/admin/checkout/` |
| 8 | Add student number search field to checkout page | `src/app/admin/checkout/page.tsx` |

