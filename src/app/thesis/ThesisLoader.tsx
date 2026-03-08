'use client'

import { usePouchDbQuery } from '@/lib/pouchdb/hooks/usePouchDbQuery'
import ThesisClient, { type Thesis } from './ThesisClient'
import { BookOpenText } from 'lucide-react'

/**
 * Replaces the server-side Supabase fetch on the Thesis page.
 * Reads thesis data from the local PouchDB database — zero network latency.
 * The usePouchDbQuery hook is reactive: the UI re-renders automatically when the sync engine
 * updates the local DB with new records from CouchDB.
 */
export default function ThesisLoader() {
  const { data: rows, isLoading } = usePouchDbQuery<Thesis>({
    selector: { type: 'thesis' }
  })
  
  // Sort by publication_year descending in memory to avoid needing complex indices initially
  const sortedRows = [...(rows || [])].sort((a, b) => (b.publication_year || 0) - (a.publication_year || 0))

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-3 animate-pulse">
          <BookOpenText className="w-5 h-5 text-violet-300" />
        </div>
        <p className="text-sm font-medium">Loading research papers…</p>
      </div>
    )
  }

  return <ThesisClient thesisList={sortedRows} />
}
