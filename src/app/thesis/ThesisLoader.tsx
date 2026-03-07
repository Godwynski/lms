'use client'

import { useQuery } from '@powersync/react'
import ThesisClient, { type Thesis } from './ThesisClient'
import { BookOpenText } from 'lucide-react'

/**
 * Replaces the server-side Supabase fetch on the Thesis page.
 * Reads thesis data from the local PowerSync SQLite database — zero network latency.
 * The useQuery hook is reactive: the UI re-renders automatically when the sync engine
 * updates the local DB with new records from Supabase.
 */
export default function ThesisLoader() {
  const { data: rows, isLoading } = useQuery<Thesis>(
    'SELECT id, title, author, course, publication_year, abstract, pdf_url, created_at FROM theses ORDER BY publication_year DESC'
  )

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

  return <ThesisClient thesisList={rows || []} />
}
