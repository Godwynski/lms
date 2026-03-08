/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { usePouchDb } from '@/lib/pouchdb/PouchDBProvider'
import ApprovalsClient from './ApprovalsClient'
import { Clock } from 'lucide-react'

/**
 * Reads pending borrow/return requests from the local PouchDB database.
 * JOINs are emulated manually in memory.
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
              status: { $in: ['pending', 'pending_return'] } 
            } 
          }),
          db.find({ selector: { type: 'book' } }),
          db.find({ selector: { type: 'profile' } })
        ])

        const bMap = new Map<string, any>(booksRes.docs.map((b: any) => [b._id, b]))
        const pMap = new Map<string, any>(profilesRes.docs.map((p: any) => [p._id, p]))

        const joined: RawRecord[] = recordsRes.docs.map((r: any) => {
          const b = bMap.get(r.book_id) || {}
          const p = pMap.get(r.borrower_id) || {}
          return {
            id: r._id,
            status: r.status,
            borrowed_date: r.borrowed_date,
            book_id: r.book_id,
            borrower_id: r.borrower_id,
            book_title: b.title || null,
            book_author: b.author || null,
            book_cover: b.cover_image_url || null,
            book_isbn: b.isbn || null,
            borrower_name: p.full_name || null,
            borrower_email: p.email || null,
            borrower_student_number: p.student_number || null,
          }
        })

        joined.sort((a, b) => (a.borrowed_date || '').localeCompare(b.borrowed_date || ''))

        if (active) {
          setRows(joined)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Approvals Loader Error:', err)
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
