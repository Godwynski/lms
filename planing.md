# Action Plan & Checklist

## 🔴 / 🟠 High Priority
- [ ] **UX/Usability**: Add password-show toggle to the Register page (`src/app/register/page.tsx:96-110`).
- [ ] **Consistency**: Migrate ReadingListsClient custom inline toast to the global Sonner `<Toaster />` (`src/app/reading-lists/ReadingListsClient.tsx:44-47`, `src/app/layout.tsx:34`).
- [ ] **Performance**: Debounce Catalog search URL updates to prevent excessive router pushes on every keystroke (`src/app/catalog/CatalogSearch.tsx:155`).
- [ ] **Performance**: Implement pagination for Admin Inventory (`/admin/books`) to avoid loading all books at once (`src/app/admin/books/page.tsx:24-28`).
- [ ] **Accessibility**: Change Book cards in the catalog from `<div onClick>` to `<button>` to enable keyboard focus and activation (`src/app/catalog/CatalogSearch.tsx:272-350`).
- [ ] **Accessibility**: Add a focus trap to the Thesis detail modal and potentially convert it to a native `<dialog>` element (`src/app/theses/ThesisClient.tsx:155-243`).
- [ ] **UX/Usability**: Move `<Register>` and `<Login>` links outside the protected NavBar state, allowing unauthenticated users to navigate without solely relying on the landing page CTAs (`src/components/NavBar.tsx:9-11`).
- [ ] **UX/Usability**: Update Borrowings page history table to include pending and overdue statuses, not just 'returned' (`src/app/borrowings/page.tsx:39-40`).

## 🟡 Medium Priority
- [ ] **Visual Design**: Change the sign-in and register submit button colors from `bg-slate-900` to `bg-indigo-600` for consistency (`src/app/login/LoginForm.tsx:133`, `src/app/register/page.tsx:115`).
- [ ] **Consistency**: Remove or update the fallback `body { font-family: Arial, Helvetica, sans-serif }` in `globals.css` to use `var(--font-sans)` (`src/app/globals.css:19`).
- [ ] **UX/Usability**: Remove the duplicate "Browse Books" Quick Action card pointing to `/catalog` on the Dashboard (`src/app/page.tsx:283-304`).
- [ ] **Visual Design**: Fix the Staff stats grid layout to prevent the 7th card from wrapping awkwardly on `xl` breakpoints (`src/app/page.tsx:264-273`).
- [ ] **Consistency**: Unify the accent colors on the Register page (`blue-500`) to match the rest of the application (`indigo-500`) (`src/app/register/page.tsx:88, 97, 126`).
- [ ] **UX/Usability**: Provide an action, tooltip, aria-label, or remove the inactive HelpCircle icon button on the login page (`src/app/login/LoginForm.tsx:12-16`).
- [ ] **UX/Usability**: Add basic search, sort, and filtering controls to the Admin Inventory table (`src/app/admin/books/page.tsx:46-100`).
- [ ] **Performance**: Adjust Catalog search page revalidate (`revalidate = 3600`) caching strategy to avoid stale book availability counts (`src/app/catalog/page.tsx:7`).
- [ ] **Accessibility**: Add an `Escape` key listener to close the Staff dropdown menu in the NavBar (`src/components/NavClient.tsx:87-97`).
- [ ] **Accessibility**: Add a visually hidden "Skip to main content" link at the top of the page for keyboard navigation (`src/components/NavClient.tsx`).
- [ ] **UX/Usability**: Add a `Full Name` field to the Register form since the database requires it, avoiding manual admin entry later (`src/app/register/page.tsx:75-121`).
- [ ] **UX/Usability**: Add "Return" or "Request Return" action buttons to active loan cards on the Borrowings page, similar to the dashboard (`src/app/borrowings/page.tsx:82-133`).

## ⚪ Low Priority
- [ ] **Responsive/Mobile**: Add scroll cues or adjust spacing at the bottom of the Home page mobile view below the feature cards (`src/app/page.tsx:180-203`).
- [ ] **Micro-interactions/Motion**: Replace `<Loader2>` spinners with skeleton screens for better layout stability during data loading (`src/app/catalog/page.tsx:139-146`).
- [ ] **Consistency**: Establish and apply a consistent typographic style for Admin section headers across all admin pages (`src/app/admin/books/page.tsx:35`, `src/app/page.tsx:277`).
- [ ] **Visual Design**: Remove the unnecessary `pb-20 md:pb-0` bottom padding in the root layout that was originally intended for a mobile bottom nav (`src/app/layout.tsx:30`).
