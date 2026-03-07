import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, CacheFirst, StaleWhileRevalidate } from "serwist";

// Augment the service worker global scope with Serwist's manifest injection point.
declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// ─── Image preload cache names ───────────────────────────────────────────────
const SUPABASE_IMAGES_CACHE = "supabase-images-cache";
const BOOK_COVERS_CACHE = "book-covers-cache";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Cache Google Fonts stylesheets
      matcher: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "google-fonts-cache",
        plugins: [
          {
            cacheWillUpdate: async ({ response }) =>
              response.status === 0 || response.status === 200 ? response : null,
          },
        ],
      }),
    },
    {
      // Cache Supabase storage images (book covers uploaded by admins)
      matcher: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
      handler: new CacheFirst({
        cacheName: SUPABASE_IMAGES_CACHE,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) =>
              response.status === 0 || response.status === 200 ? response : null,
          },
        ],
      }),
    },
    {
      // Cache Open Library / Google Books covers and Amazon cover images
      matcher: /^https:\/\/(covers\.openlibrary\.org|books\.google\.com|images-na\.ssl-images-amazon\.com)\/.*/i,
      handler: new CacheFirst({
        cacheName: BOOK_COVERS_CACHE,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) =>
              response.status === 0 || response.status === 200 ? response : null,
          },
        ],
      }),
    },
    {
      // Network-first for page navigations; serve cached page on network failure
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages-cache",
        networkTimeoutSeconds: 5,
      }),
    },
    {
      // Stale-while-revalidate for Next.js static assets (_next/static)
      matcher: /^\/\_next\/static\/.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: "next-static-cache",
      }),
    },
  ],
});

serwist.addEventListeners();

// ─── Message handler: bulk image preloading ───────────────────────────────────
// Receives { type: 'PRELOAD_IMAGES', urls: string[] } from the app.
// Fetches and caches each URL that isn't already cached — no-op for cached ones.
// Cast through unknown to use addEventListener without TS conflict on self type.
(self as unknown as Window).addEventListener("message", async (event: MessageEvent) => {
  if (event.data?.type !== "PRELOAD_IMAGES") return;

  const urls: string[] = event.data.urls ?? [];
  if (!urls.length) return;

  // Open the correct cache per URL origin
  const supabaseCache = await caches.open(SUPABASE_IMAGES_CACHE);
  const coversCache = await caches.open(BOOK_COVERS_CACHE);

  const tasks = urls.map(async (url) => {
    try {
      const cache = url.includes("supabase.co") ? supabaseCache : coversCache;
      const already = await cache.match(url);
      if (already) return; // Already cached — skip
      const response = await fetch(url, { mode: "cors" });
      if (response.ok) await cache.put(url, response);
    } catch {
      // Non-critical: network unavailable or CORS error — skip silently
    }
  });

  // Process in batches of 5 to avoid flooding the network
  const BATCH = 5;
  for (let i = 0; i < tasks.length; i += BATCH) {
    await Promise.allSettled(tasks.slice(i, i + BATCH));
  }

  // Notify the page that preloading is complete (best-effort)
  try {
    if (event.source) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event.source as any).postMessage({ type: "PRELOAD_IMAGES_DONE", count: urls.length });
    }
  } catch { /* non-critical */ }
});
