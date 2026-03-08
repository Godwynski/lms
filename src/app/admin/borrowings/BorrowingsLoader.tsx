'use client'

import { useState, useEffect } from 'react'
import { usePouchDb } from '@/lib/pouchdb/PouchDBProvider'
import BorrowingsClient from './BorrowingsClient'
import type { BorrowingRecord } from './page'
import { BookMarked } from 'lucide-react'

/**
 * Replaces the server-side SQL join on the Borrowings page.
 * Reads all active loans from the local PouchDB database and manually resolves
 * related documents (books, profiles) in memory since NoSQL has no JOINs.
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

type PouchDoc = Record<string, unknown> & { _id: string }

export default function BorrowingsLoader() {
  const db = usePouchDb()
  const [rows, setRows] = useState<RawRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    const fetchData = async () => {
      try {
        const [recordsRes, booksRes, profilesRes] = await Promise.all([
          db.find({ 
            selector: { 
              type: 'borrowing_record', 
              status: { $in: ['pending', 'borrowed', 'overdue', 'pending_return'] } 
            } 
          }),
          db.find({ selector: { type: 'book' } }),
          db.find({ selector: { type: 'profile' } })
        ])

        const bMap = new Map<string, PouchDoc>(
          (booksRes.docs as unknown as PouchDoc[]).map((b) => [b._id, b])
        )
        const pMap = new Map<string, PouchDoc>(
          (profilesRes.docs as unknown as PouchDoc[]).map((p) => [p._id, p])
        )

        const joined: RawRecord[] = (recordsRes.docs as unknown as PouchDoc[]).map((r) => {
          const b = bMap.get(String(r.book_id)) ?? {}
          const p = pMap.get(String(r.borrower_id)) ?? {}
          return {
            id: r._id,
            status: String(r.status ?? ''),
            borrowed_date: String(r.borrowed_date ?? ''),
            due_date: String(r.due_date ?? ''),
            returned_date: r.returned_date != null ? String(r.returned_date) : null,
            book_id: String(r.book_id ?? ''),
            borrower_id: String(r.borrower_id ?? ''),
            book_title: (b as PouchDoc).title != null ? String((b as PouchDoc).title) : null,
            book_author: (b as PouchDoc).author != null ? String((b as PouchDoc).author) : null,
            book_isbn: (b as PouchDoc).isbn != null ? String((b as PouchDoc).isbn) : null,
            book_cover: (b as PouchDoc).cover_image_url != null ? String((b as PouchDoc).cover_image_url) : null,
            borrower_name: (p as PouchDoc).full_name != null ? String((p as PouchDoc).full_name) : null,
            borrower_email: (p as PouchDoc).email != null ? String((p as PouchDoc).email) : null,
            borrower_student_number: (p as PouchDoc).student_number != null ? String((p as PouchDoc).student_number) : null,
          }
        })

        // Sort by due_date ascending
        joined.sort((x, y) => (x.due_date || '').localeCompare(y.due_date || ''))

        if (active) {
          setRows(joined)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Borrowings Loader Error:', err)
        if (active) setIsLoading(false)
      }
    }

    fetchData()
    const changes = db.changes({ since: 'now', live: true }).on('change', fetchData)

    return () => {
      active = false
      changes.cancel()
    }
  }, [db])

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
