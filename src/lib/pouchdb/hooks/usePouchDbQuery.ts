'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePouchDb } from '../PouchDBProvider'

/**
 * usePouchDbQuery
 *
 * A custom React hook for querying PouchDB.
 * Takes a standard PouchDB/CouchDB Mango selector query format.
 * Automatically subscribes to local changes and re-runs the query
 * so the UI stays 100% reactive to local/remote syncs.
 */
/* eslint-disable react-hooks/exhaustive-deps */
export function usePouchDbQuery<T extends Record<string, unknown>>(query: PouchDB.Find.FindRequest<T> | null) {
  const db = usePouchDb()
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Stringify query to avoid infinite re-renders if passed inline
  const queryStr = query ? JSON.stringify(query) : ''

  const fetchData = useCallback(async () => {
    if (!queryStr) {
       setData([])
       setIsLoading(false)
       return
    }

    try {
      const result = await db.find(JSON.parse(queryStr))
      // Extract the documents from the result
      setData(result.docs as unknown as T[])
      setError(null)
    } catch (err: unknown) {
      console.error('PouchDB Query Error:', err)
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [db, queryStr])

  useEffect(() => {
    if (!query) return;

    fetchData()

    // Subscribe to all changes on the sync DB
    // In a real production app with millions of records, you might want to 
    // selectively filter changes, but for most apps this is very fast.
    const changes = db.changes({
      since: 'now',
      live: true,
      include_docs: false
    }).on('change', () => {
       // Re-run the mango query to update local state
       fetchData()
    }).on('error', (err: unknown) => {
       console.error('PouchDB Changes Error:', err)
    })

    return () => {
      changes.cancel()
    }
  }, [fetchData, queryStr, db])

  return { data, isLoading, error }
}
