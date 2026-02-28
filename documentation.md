# STI College Alabang LMS Documentation

## 1. System Overview
A web-based platform streamlining library transactions via mobile-friendly access, QR-based scanning, offline resilience, and Role-Based Access Control (RBAC).

## 2. Architecture & Tech Stack
- **Frontend:** Next.js (React), Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Offline Storage:** LocalStorage, IndexedDB (PWA Service Workers)

## 3. Current Modules
- **Authentication:** Secure login via Supabase Auth, integrating Microsoft 365 SSO for students. Role-Based Access Control (RBAC) supporting granular roles (e.g., Super Admin, Librarian, Circulation Assistant) to ensure secure and appropriate access levels.
- **Catalog (Student):** Browse available books online.
- **Admin Tools:** User account management and checkout interfaces (supporting both QR codes and physical 1D barcode scanners).

---

## 4. Planned Modules (Development Roadmap)

### [ ] Phase 1: Core Inventory & Metadata (ILS Foundation)
1. **Database Schema:** Finalize Supabase logic (Books, Copies, Categories, Transactions). Ensure schema natively supports **MARC 21** standards for core cataloging fields (e.g., matching Tag 245 for Title, Tag 100 for Author) to guarantee enterprise scalability and interoperability, alongside Dewey Decimal Classification (DDC) for physical shelf organization.
2. **ISBN Scanner (Admin):** Mobile camera scanner to auto-fetch metadata using **free** APIs (Google Books/Open Library). 
3. **Hardware Barcode Support (Admin):** Ensure input fields and search interfaces are optimized for rapid 1D barcode scanning (auto-submit on scan) to support standard library hardware.
4. **Local DB Sync:** Automatically save fetched book data to local database (IndexedDB) for offline access and to Supabase.
5. **Circulation Rules Engine:** Admin settings to define global borrowing policies (e.g., maximum books per student, specific loan periods per item type).
6. **Physical Copy Management:** Generate and print unique QR codes to be affixed to *each physical copy* of a title, enabling lightning-fast scanning during checkouts and returns.
7. **Audit Trails:** Implement database triggers to log critical administrative actions (Insert/Update/Delete on Catalog, Rules, and Users) for accountability.

### [ ] Phase 2: Student OPAC (Online Public Access Catalog)
1. **Advanced Search & Facets:** Search by Title, Author, Subject, DDC, or Call Number. Filter results dynamically (e.g., by Year, Category, Availability).
2. **Virtual Shelves / Reading Lists:** Allow students to save books they want to read later into custom lists.
3. **Student Dashboard:** View current borrowed books, due dates, past history, and monetary fine status (if applicable).
4. **Digital Library Card:** A unique, automatically generated QR code accessible on the student's dashboard (which can also be printed) used as their primary identification during physical checkouts.
5. **Book Reviews & Ratings:** Allow students to leave ratings and public reviews for books they've read.
6. **SSO Login:** Complete Microsoft 365 login integration for seamless student access.
7. **Mobile PWA Enhancements:** Implement prompts encouraging students to "Add to Home Screen" to solidify the mobile-first experience.

### [ ] Phase 3: Borrowing & Reservations
1. **Rapid Checkout Flow (Admin):** Streamlined interface where the admin scans the student's Library Card QR code, followed by the Book's QR code, to instantly process a transaction.
2. **Reservation System (Student):** Interface to place book reservations online.
3. **Waitlists (Student):** Opt-in to be notified when an unavailable book is returned.
4. **Reservation Queue (Admin):** Interface to approve, prepare, and monitor pending reservations.

### [ ] Phase 4: Offline Resilience (Single Admin Node)
1. **PWA Integration:** Cache application shells (HTML/CSS/JS) for uninterrupted offline loading.
2. **Offline Transaction Queue:** Since administration logic is centralized to a single physical computer, the offline strategy focuses on queuing local actions (checkouts/returns) in IndexedDB when the internet drops.
3. **Reconnection Sync:** Automatically push queued transactions to Supabase upon reconnection. Potential conflicts (e.g., a student reserving a book online while the admin processes a physical checkout offline) are handled seamlessly by prioritizing the physical checkout event via server timestamps.

### [ ] Phase 5: Advanced LMS & Polish (Koha-inspired Tools)
1. **Fine Management:** Calculate and display penalties for overdue books (configurable by admin via Circulation Rules).
2. **Automated Email Notifications:** System automatically dispatches emails to students for upcoming deadlines, overdue notices, and reservation availability. Admins can edit the text templates for these notices.
3. **Lost/Damaged Tracking:** Specific status updates for copies that are lost, damaged, or retired.
4. **Analytics & Custom Reports:** Admin view for borrowing trends, popular titles, and exportable ad-hoc reports for audits.
5. **User Message Center:** A messaging system allowing librarians to send direct alerts to specific student OPAC dashboards.
6. **Data Privacy compliance:** Implement automated anonymization scripts or deletion policies for old transaction records to comply with the Philippine Data Privacy Act of 2012.
7. **Print Formatting:** Implement stylesheets (`@media print`) and specific views for thermal receipt printers (for fine receipts or checkout slips).

## 5. Immediate Next Steps
1. Execute **Phase 1.1**: Finalize the Database Schema mapping.
2. Execute **Phase 1.2**: Implement the ISBN Scanner component.
