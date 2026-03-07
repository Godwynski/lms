'use client'

/**
 * useSyncErrors
 *
 * Subscribes to the sync error event bus and returns the latest error.
 * Automatically dismisses transient network errors after 8 seconds.
 * Persistent errors (rls, conflict, auth) stay visible until dismissed.
 */

import { useEffect, useState } from 'react'
import { onSyncError, type SyncErrorEvent } from '@/lib/powersync/syncErrorBus'

export function useSyncErrors() {
  const [error, setError] = useState<SyncErrorEvent | null>(null)

  useEffect(() => {
    const unsubscribe = onSyncError((e) => {
      setError(e)

      // Auto-dismiss transient network errors after 8 s
      if (e.type === 'network') {
        setTimeout(() => setError(prev => prev?.timestamp === e.timestamp ? null : prev), 8000)
      }
    })
    return unsubscribe
  }, [])

  const dismiss = () => setError(null)

  return { error, dismiss }
}
