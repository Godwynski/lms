# System Architecture and Technology Stack

This document outlines the core technologies, database infrastructure, and known limitations of the Library Management System (LMS).

## 1. Programming Languages & Frameworks
- **Primary Language:** TypeScript (a typed superset of JavaScript).
- **Frontend/Backend Framework:** Next.js (version 15/16+) utilizing the App Router and React 19.
- **Styling:** Tailwind CSS (via PostCSS v4) for utility-first, responsive, and mobile-first UI design.
- **Icons:** `lucide-react` for consistent SVG iconography.

## 2. Database
- **Core Database:** PostgreSQL.
- **Database Hosting & BaaS:** Supabase. Supabase provides a fully managed Postgres database along with Authentication, Storage, and Realtime subscriptions.

## 3. Database Queries & Data Fetching
Instead of writing raw SQL strings in our code, the system communicates with the database using the **Supabase JavaScript Client** (`@supabase/supabase-js` and `@supabase/ssr`). 

- **How it works:** Supabase provides a PostgREST API on top of the Postgres database. We use the Supabase SDK to chain methods (e.g., `.select()`, `.insert()`, `.update()`, `.eq()`) which are automatically translated into secure SQL queries on the server.
- **Security:** We utilize Row Level Security (RLS) policies within Supabase to ensure that queries only return data the requesting user is authorized to see or modify. Server Actions in Next.js execute secure administrative queries using the Service Role Key when necessary.

**Example Query:**
```typescript
const { data, error } = await supabase
  .from('books')
  .select('id, title, author')
  .eq('status', 'available')
  .order('title', { ascending: true });
```

## 4. System Limitations
Currently, the system operates with the following known technical and practical limitations:

1. **Cloud Service Dependencies (Active Internet Requirement):**
   Because the database and authentication are handled by Supabase (a cloud-hosted service), the LMS requires an active, stable internet connection to function. It cannot operate in a strictly offline, localized intranet environment without migrating the database to a local Postgres instance and writing a custom auth/storage layer.

2. **External API Rate Limits:**
   Extended book information (such as language, page counts, genre, or cover images) relies on third-party APIs (e.g., Google Books API). Heavy, rapid scraping or querying of new books may trigger rate limits from these external services.

3. **Free-Tier Infrastructure Limits:**
   If hosted on free-tier services (e.g., Vercel for the Next.js app, Supabase Free Tier for the database), the application is bound by specific quotas:
   - **Database Size & Connections:** Supabase free tier limits the database to 500MB and restricts the maximum number of concurrent direct connections.
   - **Serverless Execution:** Next.js API routes and Server Actions hosted on Vercel have an execution timeout (typically 10 to 60 seconds). Very computationally heavy tasks might fail if they take too long.

4. **Image Storage & Processing:**
   User uploads for book covers or avatars utilize Supabase Storage. Excessive uploading of very large, unoptimized images can quickly exhaust storage and bandwidth limits. While the app uses `sharp` for some manipulation/Next.js image optimization, there are hard caps on transformation requests on standard deployment tiers.

5. **Real-time Synchronization Quotas:**
   Any features utilizing Supabase Realtime (e.g., immediate stock updates) are subject to concurrent connection and message limits. If the user base grows substantially, these quotas may need to be upgraded to standard paid tiers.
