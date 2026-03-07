/**
 * syncErrorBus
 *
 * A lightweight browser event bus that carries sync errors from the
 * PowerSync connector (which runs in a Web Worker context) into the
 * React component tree.
 *
 * The connector emits SyncErrorEvents; React components subscribe
 * using the `useSyncErrors` hook.
 */

export type SyncErrorType =
  | 'rls'            // Row-Level Security rejection — data was not saved (Supabase 403)
  | 'conflict'       // Unique constraint violated — duplicate record attempted
  | 'auth'           // Session expired / JWT invalid
  | 'network'        // Transient network failure — will be retried
  | 'unknown'        // Unclassified error

export type SyncErrorEvent = {
  type: SyncErrorType
  message: string
  table?: string
  code?: string
  timestamp: number
}

const EVENT_NAME = 'lms:sync-error'

/** Emit a sync error from the connector */
export function emitSyncError(event: Omit<SyncErrorEvent, 'timestamp'>) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<SyncErrorEvent>(EVENT_NAME, {
      detail: { ...event, timestamp: Date.now() },
    })
  )
}

/** Subscribe to sync errors in a React component (used by useSyncErrors) */
export function onSyncError(handler: (e: SyncErrorEvent) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const listener = (ev: Event) => handler((ev as CustomEvent<SyncErrorEvent>).detail)
  window.addEventListener(EVENT_NAME, listener)
  return () => window.removeEventListener(EVENT_NAME, listener)
}

/** Classify a Supabase / Postgres error code into a SyncErrorType */
export function classifyError(code?: string): SyncErrorType {
  if (!code) return 'unknown'
  if (code === '42501' || code === '403') return 'rls'
  if (code === '23505') return 'conflict'
  if (code === 'PGRST301' || code === '401') return 'auth'
  if (code === 'ECONNREFUSED' || code === 'FETCH_ERROR') return 'network'
  return 'unknown'
}
