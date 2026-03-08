'use client'

/**
 * useImagePreloader
 *
 * Extracts all cover_image_urls from PouchDB and sends them to the SW
 */

import { useEffect } from 'react'
import { usePouchDb } from '@/lib/pouchdb/PouchDBProvider'

const SESSION_KEY = 'lms:images-preloaded'

export function useImagePreloader() {
  const db = usePouchDb()

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (sessionStorage.getItem(SESSION_KEY)) return
    if (!('serviceWorker' in navigator)) return

    const run = async () => {
      try {
        await new Promise(r => setTimeout(r, 3000))

        const result = await db.find({
          selector: { 
            type: 'book',
            cover_image_url: { $exists: true, $ne: null }
          },
          fields: ['cover_image_url']
        })

        const urls = result.docs.map((r) => String((r as unknown as Record<string, unknown>).cover_image_url ?? '')).filter(u => u !== '')
        if (!urls.length) return

        const reg = await navigator.serviceWorker.ready
        const sw = reg.active
        if (!sw) return

        sw.postMessage({ type: 'PRELOAD_IMAGES', urls })
        sessionStorage.setItem(SESSION_KEY, '1')

        console.info(`[ImagePreloader] Queued ${urls.length} cover images for offline caching`)
      } catch (e) {
        console.warn('[ImagePreloader] Preload failed (non-fatal):', e)
      }
    }

    run()
  }, [db])
}
