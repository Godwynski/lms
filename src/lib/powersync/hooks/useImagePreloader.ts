'use client'

/**
 * useImagePreloader
 *
 * After PowerSync syncs the books table, this hook collects every
 * `cover_image_url` from local SQLite and sends them to the Service Worker
 * for background caching. Once cached, book covers load instantly
 * even without a network connection.
 *
 * ─ How it works ────────────────────────────────────────────────────────────
 * 1. Query local SQLite: SELECT DISTINCT cover_image_url FROM books
 * 2. Filter out nulls, blanks, and already-sent urls (via sessionStorage)
 * 3. Post { type: 'PRELOAD_IMAGES', urls } to the active Service Worker
 * 4. The SW fetches each image and stores it in the Cache API
 *
 * ─ Design notes ─────────────────────────────────────────────────────────────
 * - Runs ONCE per session (tracked in sessionStorage) to avoid repeated work
 * - Deferred 3 s after mount so it doesn't compete with initial page load
 * - Completely non-blocking: failures are silent
 * - Works in production only (SW is disabled in dev)
 */

import { useEffect } from 'react'
import { useLmsDb } from '@/lib/powersync/PowerSyncProvider'

const SESSION_KEY = 'lms:images-preloaded'

export function useImagePreloader() {
  const db = useLmsDb()

  useEffect(() => {
    // Only run in production (SW is disabled in dev mode)
    if (process.env.NODE_ENV !== 'production') return
    // Only run once per browser session
    if (sessionStorage.getItem(SESSION_KEY)) return
    // SW must be supported and registered
    if (!('serviceWorker' in navigator)) return

    const run = async () => {
      try {
        // Wait 3 s after mount so initial page load isnishes first
        await new Promise(r => setTimeout(r, 3000))

        // Query all distinct cover image URLs from local SQLite
        const result = await db.getAll<{ url: string }>(
          `SELECT DISTINCT cover_image_url AS url
           FROM books
           WHERE cover_image_url IS NOT NULL
             AND cover_image_url != ''`
        )

        const urls = result.map(r => r.url).filter(Boolean)
        if (!urls.length) return

        // Get the active service worker
        const reg = await navigator.serviceWorker.ready
        const sw = reg.active
        if (!sw) return

        // Send URLs to SW for background caching
        sw.postMessage({ type: 'PRELOAD_IMAGES', urls })

        // Mark as done for this session
        sessionStorage.setItem(SESSION_KEY, '1')

        console.info(`[ImagePreloader] Queued ${urls.length} cover images for offline caching`)
      } catch (e) {
        // Non-critical — silently fail
        console.warn('[ImagePreloader] Preload failed (non-fatal):', e)
      }
    }

    run()
  }, [db])
}
