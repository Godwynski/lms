'use client'

import { useQuery } from '@powersync/react'
import BorrowingsClient from './BorrowingsClient'
import type { BorrowingRecord } from './page'
import { BookMarked } from 'lucide-react'

/**
 * Replaces the server-side Supabase fetch on the Borrowings page.
 * Reads all active loans from the local PowerSync SQLite database with a flat JOIN.
 */
type RawRecord = {
  id: string
  status: string
  borrowed_date: string
  due_date: string
  returned_date: string | null
  book_id: string
  borrower_id: string
  book_title: string | null
  book_author: string | null
  book_isbn: string | null
  book_cover: string | null
  borrower_name: string | null
  borrower_email: string | null
  borrower_student_number: string | null
}

export default function BorrowingsLoader() {
  const { data: rows, isLoading } = useQuery<RawRecord>(`
    SELECT
      br.id,
      br.status,
      br.borrowed_date,
      br.due_date,
      br.returned_date,
      br.book_id,
      br.borrower_id,
      b.title           AS book_title,
      b.author          AS book_author,
      b.isbn            AS book_isbn,
      b.cover_image_url AS book_cover,
      p.full_name       AS borrower_name,
      p.email           AS borrower_email,
      p.student_number  AS borrower_student_number
    FROM borrowing_records br
    LEFT JOIN books b ON b.id = br.book_id
    LEFT JOIN profiles p ON p.id = br.borrower_id
    WHERE br.status IN ('pending', 'borrowed', 'overdue', 'pending_return')
    ORDER BY br.due_date ASC
  `)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-3 animate-pulse">
          <BookMarked className="w-5 h-5 text-amber-300" />
        </div>
        <p className="text-sm font-medium">Loading active loans…</p>
      </div>
    )
  }

  // Map flat SQL result to the nested BorrowingRecord shape
  const records: BorrowingRecord[] = (rows || []).map(row => ({
    id: row.id,
    status: row.status,
    borrowed_date: row.borrowed_date,
    due_date: row.due_date,
    returned_date: row.returned_date,
    book_id: row.book_id,
    borrower_id: row.borrower_id,
    books: {
      id: row.book_id,
      title: row.book_title || 'Unknown Title',
      author: row.book_author,
      isbn: row.book_isbn || '',
      cover_image_url: row.book_cover,
    },
    profiles: {
      full_name: row.borrower_name,
      email: row.borrower_email || '',
      student_number: row.borrower_student_number,
    },
  }))

  return <BorrowingsClient records={records} />
}
