# Local-First Migration Plan & Phases

This document outlines the comprehensive, industry-standard approach to migrating the current LMS from a traditional server-client architecture (direct Supabase queries) to a **Local-First architecture** using PowerSync and Supabase.

## Core Objectives
1.  **Zero-Latency UI:** The app reads and writes to a local database, making the UI feel instantaneous.
2.  **Offline Capability:** The app functions completely without an internet connection.
3.  **Background Syncing:** Changes are synced to Supabase seamlessly when online.
4.  **Mobile-First UX:** Provide clear indicators of sync status and prevent the user from feeling lost when offline.

## Recommended Tech Stack
*   **Backend:** Supabase (Existing)
*   **Sync Engine:** PowerSync (Industry standard for PG-to-SQLite sync)
*   **Local DB:** SQLite (via PowerSync WASM)
*   **Offline Shell:** `next-pwa` or `@serwist/next` (to cache assets)
*   **UI/Alerts:** SweetAlert2 (Existing - `swal.ts`)

---

## Migration Phases

### Phase 1: The Offline Shell (PWA Foundation)
Before data can be offline, the application itself must load without an internet connection.
*   **1.1 Install PWA Wrapper:** Integrate `@serwist/next` (modern successor to `next-pwa`) to configure service workers.
*   **1.2 Manifest Configuration:** Create `manifest.json` with appropriate icons and theme colors to allow installation as a native-feeling mobile app.
*   **1.3 Asset Caching Strategy:** Configure the service worker to aggressively cache HTML, CSS, JS, and essential static images (e.g., logos).
*   **1.4 Verification:** Validate that the app can be installed on a mobile device and loads the UI shell while in airplane mode.

### Phase 2: Local Database & Schema Setup
Prepare the client to hold a mirror of the required backend data.
*   **2.1 Install PowerSync SDK:** Add `@powersync/react` and `@powersync/web`.
*   **2.2 Client-Side Schema:** Define the local SQLite schema to match the necessary Supabase tables (`books`, `theses`, `borrowings`, `users`, etc.).
*   **2.3 DB Initialization:** Create a global React context or provider (e.g., inside `layout.tsx` or a dedicated `PowerSyncProvider`) to initialize the local SQLite database on app load.

### Phase 3: Sync Rules & Authentication (Backend)
Ensure data is synced securely and efficiently. We cannot sync the entire database to every user.
*   **3.1 Supabase Connector:** Set up the PowerSync backend service (can be self-hosted or cloud) to connect to the Supabase Postgres instance.
*   **3.2 Sync Rules (Buckets):** Define what data each user role receives.
    *   *Students:* Sync catalog (books/thesis), their own profile, and their own borrowing history.
    *   *Admins:* Sync everything, including pending approvals and other users' records.
*   **3.3 Auth Integration:** Link the existing `@supabase/ssr` authentication to the PowerSync client so the sync engine authenticates using the Supabase JWT.

### Phase 4: Refactoring Reads (Queries)
Change how the UI fetches data, moving from network requests to local, reactive queries.
*   **4.1 Replace Supabase `select`:** Find all instances of `supabase.from('...').select()` in components.
*   **4.2 Implement `usePowerSyncQuery`:** Replace them with PowerSync's reactive hooks (e.g., `useQuery('SELECT * FROM books')`).
*   **4.3 UI Update:** Because local queries are reactive, the UI will automatically update whenever the local DB changes. No manual refetching is needed. Existing virtualization (`@tanstack/react-virtual`) will work perfectly with local datasets.

### Phase 5: Refactoring Writes (Mutations)
Change how the app modifies data. Writes go to the local DB first, then sync to Supabase.
*   **5.1 Local Writes:** Modify action handlers (e.g., borrowing a book, adding a thesis) to execute standard SQL `INSERT`/`UPDATE` against the local PowerSync SQLite database instead of calling `supabase.from('...').insert()`.
*   **5.2 Sync Queue Management:** PowerSync automatically queues these local writes. When online, the queue is processed against Supabase.

### Phase 6: Sync State & UX Handlers (User Friendly & Mobile First)
Implement industry-standard UX patterns for offline apps using the existing `swal.ts`.
*   **6.1 Sync Indicator:** Add a subtle status indicator in the `NavClient.tsx` (e.g., 🟢 Online/Synced, 🟡 Syncing, 🔴 Offline).
*   **6.2 Offline Modals:** Use SweetAlert2 to notify users when they perform critical actions offline: *"Your request to borrow this book has been saved locally and will be processed when you reconnect."*
*   **6.3 Conflict Resolution Alerts:** If an admin approves a request that was already rejected by another admin (and this is discovered during sync), display a standard modal to resolve the conflict.
*   **6.4 Initial Load State:** When a user logs in on a new device, show a friendly loading screen *"Syncing your library..."* until the initial data pool is downloaded.

### Phase 7: Testing & Deployment
*   **7.1 Network Simulation:** Extensively test the UI using Chrome DevTools Network Throttling (Offline, Slow 3G) to ensure seamless transitions.
*   **7.2 Cross-Device Testing:** Verify the PWA installation and local storage limits on physical Android and iOS devices.
*   **7.3 Rollout:** Deploy the updated sync architecture.
