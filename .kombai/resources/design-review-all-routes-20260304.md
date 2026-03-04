# Design Review Results: Full App — All Routes

**Review Date**: 2026-03-04  
**Routes Reviewed**: `/`, `/login`, `/register`, `/catalog`, `/borrowings`, `/reading-lists`, `/theses`, `/admin/books`, `/admin/checkout`, `/admin/approvals`, `/admin/users`, `/admin/audit`  
**Focus Areas**: Visual Design, UX/Usability, Responsive/Mobile, Accessibility, Micro-interactions/Motion, Consistency, Performance

---

## Summary

The app has a strong visual foundation — a clean indigo/blue palette, consistent rounded cards, and good use of subtle gradient backgrounds. The most critical issues are concentrated in **accessibility** (missing semantic landmarks, no form `<label>` elements, dead links) and **consistency** (custom toast in Reading Lists conflicts with the global Sonner setup, duplicate quick-action cards, heading hierarchy violations). Several UX gaps — like a non-functional "Forgot Password" link, no search debounce, and missing `<main>` wrapper — should be prioritized before launch.

---

## Issues

| # | Issue | Criticality | Category | Location |
|---|-------|-------------|----------|----------|
| 1 | **App metadata title not updated** — still reads `"Create Next App"` in browser tab for most pages | 🔴 Critical | Consistency | `src/app/layout.tsx:17-20` |
| 2 | **`middleware.ts` uses deprecated file convention** — Next.js warns on startup: "The 'middleware' file convention is deprecated. Please use 'proxy' instead." | 🔴 Critical | Performance | `src/middleware.ts` |
| 3 | **Form inputs have no `<label>` elements** — Login and Register use only `placeholder` text as labels. When a user starts typing, the label context disappears entirely. This violates WCAG 2.1 SC 1.3.1 and SC 3.3.2 | 🔴 Critical | Accessibility | `src/app/login/LoginForm.tsx:73-109`, `src/app/register/page.tsx:78-109` |
| 4 | **Login and Register pages are missing `<main>` landmark** — Accessibility audit flags `landmark-one-main` and `region` violations. Screen reader users cannot jump to main content | 🔴 Critical | Accessibility | `src/app/login/page.tsx`, `src/app/register/page.tsx` |
| 5 | **Login form `h2` used as primary heading** — Page's main heading is `<h2>` ("Library Portal"), failing the `page-has-heading-one` audit rule. Assistive tech cannot identify the page heading correctly | 🔴 Critical | Accessibility | `src/app/login/LoginForm.tsx:26` |
| 6 | **"Forgot password?" is a dead link** — `href="#"` causes the page to jump to top on click. No password-reset flow is implemented; the link creates a false affordance | 🔴 Critical | UX/Usability | `src/app/login/LoginForm.tsx:124` |
| 7 | **Register page has no password-show toggle** — Login page has the eye icon for show/hide, but Register does not. Users entering a new password have no way to verify what they typed | 🟠 High | UX/Usability | `src/app/register/page.tsx:96-110` |
| 8 | **`ReadingListsClient` uses a custom inline toast instead of global Sonner** — The app has `<Toaster />` from Sonner in the root layout, but Reading Lists implements its own `setFeedback` state + `setTimeout` toast. This produces a different-looking notification at a different position | 🟠 High | Consistency | `src/app/reading-lists/ReadingListsClient.tsx:44-47`, `src/app/layout.tsx:34` |
| 9 | **Catalog search triggers URL update on every keystroke** — `updateUrl` is called inside `onChange` with no debounce, causing a full Next.js router push on every character typed. This hammers navigation history and causes excessive re-renders | 🟠 High | Performance | `src/app/catalog/CatalogSearch.tsx:155` |
| 10 | **Admin Inventory (`/admin/books`) loads ALL books with no pagination** — `select('*').order(...)` with no `.range()` limit. On large catalogs this causes slow page loads and excessive memory usage | 🟠 High | Performance | `src/app/admin/books/page.tsx:24-28` |
| 11 | **Book cards in catalog use `<div onClick>` instead of `<button>`** — Clicking a book opens a detail dialog, but the outer card `<div>` is not keyboard-focusable. Keyboard-only users cannot open book details without using the save button | 🟠 High | Accessibility | `src/app/catalog/CatalogSearch.tsx:272-350` |
| 12 | **Thesis detail modal lacks a focus trap** — When the thesis modal opens, Tab key can escape to the background. The modal uses a `div` with `role="dialog"` rather than a native `<dialog>` element, so browser-native focus containment is absent | 🟠 High | Accessibility | `src/app/theses/ThesisClient.tsx:155-243` |
| 13 | **Homepage `<Register>` and `<Login>` are inaccessible from within the app without the NavBar** — The NavBar is hidden for logged-out users (`if (!user) return null`). This means there is no navigation chrome for unauthenticated users; only CTA buttons on the landing page guide them | 🟠 High | UX/Usability | `src/components/NavBar.tsx:9-11` |
| 14 | **Borrowings page missing pending/overdue statuses in history table** — The history section only filters for `status === 'returned'`, so `overdue`, `pending`, and `pending_return` records silently disappear from the history list | 🟠 High | UX/Usability | `src/app/borrowings/page.tsx:39-40` |
| 15 | **Sign-in button color is `bg-slate-900` (dark) — inconsistent with indigo theme** — Every other primary CTA across the app uses `bg-indigo-600`. The login and register submit buttons use `bg-slate-900`, creating a jarring inconsistency | 🟡 Medium | Visual Design | `src/app/login/LoginForm.tsx:133`, `src/app/register/page.tsx:115` |
| 16 | **`globals.css` declares a `body { font-family: Arial, Helvetica, sans-serif }` fallback** — The body class applies `font-sans` (Geist) via Tailwind, but the unlayered CSS rule could conflict or take precedence in edge cases. The font-family line in `body {}` block should use `var(--font-sans)` or be removed | 🟡 Medium | Consistency | `src/app/globals.css:19` |
| 17 | **Quick Actions on Dashboard has two cards pointing to `/catalog`** — "Search Catalog" and "Browse Books" are both `href="/catalog"` for borrowers. This wastes a grid slot and confuses users | 🟡 Medium | UX/Usability | `src/app/page.tsx:283-304` |
| 18 | **Staff stats grid has 7 stat cards in a 6-column max grid** — `grid-cols-2 lg:grid-cols-3 xl:grid-cols-6` with 7 `<StatCard>` items causes the 7th card ("Borrowers") to wrap awkwardly onto a new row at xl breakpoints | 🟡 Medium | Visual Design | `src/app/page.tsx:264-273` |
| 19 | **Register page uses `blue-500` accent; Login page uses `indigo-500`** — These are visually similar but distinct. The register form focus ring, icon color, and link colors are `blue-*` while the rest of the app is `indigo-*` | 🟡 Medium | Consistency | `src/app/register/page.tsx:88, 97, 126` |
| 20 | **`HelpCircle` icon button on login page has no action** — The button renders in the top-right of the login card but has `type="button"` and no `onClick` handler, no tooltip, and no `aria-label`. It provides no value and misleads users | 🟡 Medium | UX/Usability | `src/app/login/LoginForm.tsx:12-16` |
| 21 | **Admin Inventory table has no search or filter** — The `/admin/books` page renders a raw table of all books with no search, sort, or filter controls. With a large catalog this becomes unusable | 🟡 Medium | UX/Usability | `src/app/admin/books/page.tsx:46-100` |
| 22 | **Catalog search `revalidate = 3600` may return stale total counts** — The page-level cache means the result count and book list can be up to 1 hour behind the database, which is confusing when books are checked in/out | 🟡 Medium | Performance | `src/app/catalog/page.tsx:7` |
| 23 | **Escape key does not close the Staff dropdown menu in NavBar** — The dropdown closes on outside click but has no `keydown` listener for `Escape`. This violates the ARIA Authoring Practices Guide pattern for menus | 🟡 Medium | Accessibility | `src/components/NavClient.tsx:87-97` |
| 24 | **No skip-to-content link for keyboard navigation** — The app has a sticky navbar with many links. Keyboard users must Tab through all nav items on every page load before reaching the main content | 🟡 Medium | Accessibility | `src/components/NavClient.tsx` (add at top) |
| 25 | **Register form has no Full Name field** — User profiles have a `full_name` column but it's not collected during registration, requiring a manual data-entry step by admins later | 🟡 Medium | UX/Usability | `src/app/register/page.tsx:75-121` |
| 26 | **Borrowings page has no "Return" / "Request Return" action** — Active loan cards on `/borrowings` show due date status but offer no action. The dashboard home page has a `<ReturnButton>` but the dedicated borrowings page does not | 🟡 Medium | UX/Usability | `src/app/borrowings/page.tsx:82-133` |
| 27 | **Home page mobile — feature cards stack to full-width 1-column** — On 375px the 3 feature cards stack vertically as intended, but there is a lot of empty space below the CTA buttons before the page ends, with no scroll cue | ⚪ Low | Responsive/Mobile | `src/app/page.tsx:180-203` |
| 28 | **No loading skeleton screens — only spinners** — Pages show a centered `<Loader2>` spinner while data loads. Skeleton screens provide better layout stability and perceived performance | ⚪ Low | Micro-interactions/Motion | `src/app/catalog/page.tsx:139-146` |
| 29 | **Admin section headers use inconsistent typographic styles** — Some use `text-sm font-bold text-slate-500 uppercase tracking-wider` (dashboard), while others like `/admin/books` use `text-2xl font-bold text-slate-900` — no consistent admin header pattern | ⚪ Low | Consistency | `src/app/admin/books/page.tsx:35`, `src/app/page.tsx:277` |
| 30 | **`pb-20 md:pb-0` bottom padding in layout suggests a removed bottom nav** — The extra bottom padding on mobile was meant to accommodate a mobile bottom navigation bar that no longer exists, leaving unnecessary whitespace at the bottom of every page on mobile | ⚪ Low | Visual Design | `src/app/layout.tsx:30` |

---

## Criticality Legend
- 🔴 **Critical**: Breaks functionality or violates accessibility standards
- 🟠 **High**: Significantly impacts user experience or design quality
- 🟡 **Medium**: Noticeable issue that should be addressed
- ⚪ **Low**: Nice-to-have improvement

---

## Next Steps

**Immediate (Critical)**
1. Add `<label>` elements to all form inputs in Login and Register pages
2. Wrap page content in `<main>` on Login and Register; change `h2` to `h1`
3. Implement a real password-reset flow or remove the "Forgot password?" link
4. Rename `middleware.ts` to `proxy.ts` as required by NextJS 16
5. Update `layout.tsx` metadata to reflect the actual app name

**Short-term (High)**
6. Add show/hide toggle to the Register password field
7. Replace the custom inline toast in `ReadingListsClient` with Sonner's `toast()`
8. Debounce the catalog search input (300–500ms) before pushing to the URL
9. Add pagination to the `/admin/books` page
10. Wrap catalog book cards in `<button>` elements for keyboard accessibility
11. Use native `<dialog>` for the Thesis modal (or add a focus trap)
12. Show all borrowing statuses (overdue, pending) in the borrowings history table

**Medium-term**
13. Unify the primary CTA button color to `bg-indigo-600` on Login/Register
14. Remove the non-functional `HelpCircle` button from Login
15. Add a skip-to-content `<a>` link before the navbar
16. Add Escape key handler to the staff dropdown menu
17. Add a Full Name field to the Register form
18. Add search/filter to `/admin/books`
19. Merge the two duplicate "Search Catalog" / "Browse Books" quick actions
20. Fix the 7-item stat grid to use `xl:grid-cols-7` or consolidate stats

**Polish**
21. Replace spinner-only loading states with skeleton screens
22. Remove orphaned `pb-20 md:pb-0` bottom padding on mobile
23. Standardize admin section heading styles with a shared component or CSS class
24. Align the Register page accent from `blue-*` to `indigo-*`
