# STI College Alabang — Library Management System (LMS)

> **Documentation v2.0** | A modern, web-based library reservation, borrowing, and inventory management system with QR-based scanning.

---

## 1. Academic Background & Objectives

The way we manage information is changing fast, but many school libraries still face big challenges with keeping track of their books. At STI College Alabang, the library needs to handle many different types of students and a wide variety of subjects every single day. Currently, manual ways of recording who borrows a book or checking if a book is still on the shelf can be very slow and can lead to mistakes.

This project focuses on creating a web-based system specifically designed to solve these issues using modern tools like QR codes and online syncing, ensuring every student has fair access to books.

### General Objectives
To design and develop a web-based library book reservation, borrowing, and inventory management system with QR-based scanning that enhances efficiency in library transactions, improves inventory tracking accuracy, and provides convenient access.

### Specific Objectives
- **Secure Platform:** Allow students to search, reserve, and borrow library books online.
- **QR Scanning:** Faster and more accurate book check-in and check-out processes.
- **Automated Inventory:** Track book availability, quantity, and status in real time.
- **User-Friendly Interface:** Easy management for both students and librarians.
- **Notifications:** Inform users about reservation confirmations, due dates, and overdue books.
- **Reports & Analytics:** Monitor book circulation, popular titles, and inventory status.
- **Security & Integrity:** User authentication and strict role-based access control (RBAC).

---

## 2. Tech Stack & Architecture

| Layer | Technology |
|---|---|
| **Frontend Framework** | Next.js (App Router, Server Components, React 19) |
| **Language** | TypeScript |
| **Styling & UI** | Tailwind CSS, Lucide Icons |
| **Backend & Database** | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| **Image Processing** | `sharp` — server-side cover compression & WebP conversion |
| **Security** | Row Level Security (RLS) policies over PostgREST API |

### System Limitations & Considerations
1. **Cloud Service Dependencies:** Operations require an active internet connection to communicate with the hosted Supabase database and authentication services.
2. **External API Limits:** Extended book information (language, page counts) relies on third-party APIs (e.g., Google Books) which have strict rate limits.
3. **Free-Tier Constraints:** If hosted on free tiers (Vercel/Supabase), the system is bound to 500MB DB sizes, restricted concurrent connections, and 10-60 second serverless function timeouts.

---

## 3. Database Schema & Security

The system uses a robust PostgreSQL schema with explicit relations and atomic transaction guards.

| Table | Purpose |
|---|---|
| `auth.users` | Supabase-managed authentication accounts |
| `public.profiles` | Extended info: `full_name`, `role`, `student_number`, `library_card_qr` |
| `public.books` | Book catalog (MARC 21-aligned) + DDC + shelf location + categories |
| `public.copies` | Physical condition tracking (Available, Borrowed, Damaged, Lost) |
| `public.borrowing_records` | Checkout/return transactions, status, due dates |
| `public.theses` | Electronic research metadata, abstracts, and embedded PDFs |
| `public.fines` | Automated penalty tracking for overdue transactions |
| `public.holds` | Pre-flight validation; blocks checkouts if active restrictions exist |

### Role-Based Access Control (RBAC)
- `super_admin` — Full system control.
- `librarian` — Catalog + user management + circulation + fines.
- `circulation_assistant` — Checkout/return operations only.
- `borrower` — Standard student access (search + personal borrowing history).

---

## 4. Core Features & Administrative Modules

### Physical Circulation (Counter-Based)
* **Student ID / Book QR System:** Camera-based instant scanning for check-in/out (`QRScanner.tsx`).
* **Librarian Approval Loop:** Students cannot self-borrow. A staff member must scan/type both IDs to authorize transactions.
* **Real-Time Compliance Validation:** The `atomic_checkout` stored procedure checks for active "Holds" or unpaid "Fines" before allowing any new borrows.

### Student Search & Discovery (Mobile/Web)
* **Book Locator:** Specific shelf numbers, rows, and categories shown directly on search cards.
* **Availability Status:** Real-time (Available / Checked Out).
* **Thesis Explorer:** Browse and read past school research via an embedded PDF Viewer.
* **Personal Dashboard:** View currently borrowed books, strict due dates, and accumulated fines.

### Import / Export Data Hub
* **CSV Import:** Bulk CSV upload to batch-upsert books into the catalog, with a built-in client-side parser and preview table.
* **Reporting Exports:** Download the full book catalog or export all active borrowing circulation records as CSV files.

### Audit & Stock-Taking Mode
* **Mobile-First Scanning:** A mobile-optimised interface for librarians to walk the shelves and physically verify inventory.
* **Discrepancy Engine:** Automatically detects and flags missing books (in database but never scanned) or duplicate unexpected scans.
* **Session Export:** Export the physical audit reconciliation summary as a CSV.

---

## 5. Digital Library Card Specification

The Digital Library Card replaces physical cards by displaying a scannable QR code directly on the student's phone dashboard.

**QR Payload Format:** `STICAL-LMS:USER:{user_id}:{student_number}`

The checkout scanner automatically parses whether a scanned QR code is a student (starting with `STICAL-LMS:USER:`) or a book copy (starting with `STICAL-LMS:BOOK:`), seamlessly transitioning the checkout context without requiring the staff member to manually click different input fields.

---

## 6. Setup & Environment Variables

Required `.env.local` variables for local development:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GOOGLE_BOOKS_API_KEY=optional_google_api_key
```

Run the development server:
```bash
npm install
npm run dev
```