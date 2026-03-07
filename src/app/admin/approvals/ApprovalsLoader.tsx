'use client'

import { useQuery } from '@powersync/react'
import ApprovalsClient from './ApprovalsClient'
import { Clock } from 'lucide-react'

/**
 * Replaces the server-side Supabase fetch on the Approvals page.
 * Reads pending borrow/return requests from the local PowerSync SQLite database.
 * JOIN emulated via a second query since SQLite useQuery doesn't support supabase-style joins.
 * The data is enriched by joining borrowing_records with books and profiles locally.
 */
type RawRecord = {
  id: string
  status: string
  borrowed_date: string
  book_id: string
  borrower_id: string
  book_title: string | null
  book_author: string | null
  book_cover: string | null
  book_isbn: string | null
  borrower_name: string | null
  borrower_email: string | null
  borrower_student_number: string | null
}

export default function ApprovalsLoader() {
  const { data: rows, isLoading } = useQuery<RawRecord>(`
    SELECT
      br.id,
      br.status,
      br.borrowed_date,
      br.book_id,
      br.borrower_id,
      b.title        AS book_title,
      b.author       AS book_author,
      b.cover_image_url AS book_cover,
      b.isbn         AS book_isbn,
      p.full_name    AS borrower_name,
      p.email        AS borrower_email,
      p.student_number AS borrower_student_number
    FROM borrowing_records br
    LEFT JOIN books b ON b.id = br.book_id
    LEFT JOIN profiles p ON p.id = br.borrower_id
    WHERE br.status IN ('pending', 'pending_return')
    ORDER BY br.borrowed_date ASC
  `)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mb-3 animate-pulse">
          <Clock className="w-5 h-5 text-indigo-300" />
        </div>
        <p className="text-sm font-medium">Loading pending requests…</p>
      </div>
    )
  }

  // Normalize flat SQL JOIN rows into the nested shape ApprovalsClient expects
  const normalizedRequests = (rows || []).map(row => ({
    id: row.id,
    status: row.status,
    borrowed_date: row.borrowed_date,
    book_id: row.book_id,
    borrower_id: row.borrower_id,
    books: {
      id: row.book_id,
      title: row.book_title || 'Unknown Book',
      author: row.book_author || '',
      cover_image_url: row.book_cover || '',
      isbn: row.book_isbn || '',
    },
    profiles: {
      full_name: row.borrower_name || '',
      email: row.borrower_email || '',
      student_number: row.borrower_student_number || '',
    },
  }))

  return <ApprovalsClient initialRequests={normalizedRequests} />
}
