'use client'

import { useQuery } from '@powersync/react'
import ReadingListsClient from './ReadingListsClient'
import type { ReadingList, ListBook, Book } from './ReadingListsClient'
import { BookMarked } from 'lucide-react'

type RawRow = {
  lb_id: string
  lb_added_at: string
  lb_book_id: string
  list_id: string
  list_name: string
  list_created_at: string
  book_id: string | null
  book_title: string | null
  book_author: string | null
  book_cover: string | null
  book_available: number | null
  book_total: number | null
  book_isbn: string | null
  book_ddc: string | null
}

export default function ReadingListsLoader({ userId }: { userId: string }) {
  const { data: rows, isLoading } = useQuery<RawRow>(`
    SELECT
      rl.id           AS list_id,
      rl.name         AS list_name,
      rl.created_at   AS list_created_at,
      rlb.id          AS lb_id,
      rlb.added_at    AS lb_added_at,
      rlb.book_id     AS lb_book_id,
      b.id            AS book_id,
      b.title         AS book_title,
      b.author        AS book_author,
      b.cover_image_url AS book_cover,
      b.available_copies AS book_available,
      b.total_copies  AS book_total,
      b.isbn          AS book_isbn,
      b.ddc_call_number AS book_ddc
    FROM reading_lists rl
    LEFT JOIN reading_list_books rlb ON rlb.list_id = rl.id
    LEFT JOIN books b ON b.id = rlb.book_id
    WHERE rl.user_id = ?
    ORDER BY rl.created_at ASC, rlb.added_at ASC
  `, [userId])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3 animate-pulse">
          <BookMarked className="w-5 h-5 text-indigo-300" />
        </div>
        <p className="text-sm font-medium">Loading reading lists…</p>
      </div>
    )
  }

  // Group flat SQL JOIN rows into nested ReadingList[] using the exact types from ReadingListsClient
  const listsMap = new Map<string, ReadingList>()

  for (const row of (rows || [])) {
    if (!listsMap.has(row.list_id)) {
      listsMap.set(row.list_id, {
        id: row.list_id,
        name: row.list_name,
        created_at: row.list_created_at,
        reading_list_books: [],
      })
    }
    const list = listsMap.get(row.list_id)!
    if (row.lb_id) {
      const book: Book | undefined = row.book_id ? {
        id: row.book_id,
        title: row.book_title || '',
        // SQLite returns null for LEFT JOIN misses; coerce to undefined for Book type
        author: row.book_author ?? undefined,
        cover_image_url: row.book_cover,
        available_copies: row.book_available ?? 0,
        total_copies: row.book_total ?? 0,
        isbn: row.book_isbn ?? undefined,
        ddc_call_number: row.book_ddc ?? undefined,
      } : undefined

      const listBook: ListBook = {
        id: row.lb_id,
        added_at: row.lb_added_at,
        book_id: row.lb_book_id,
        books: book ? [book] : [],
      }
      list.reading_list_books.push(listBook)
    }
  }

  const lists = Array.from(listsMap.values())
  return <ReadingListsClient lists={lists} userId={userId} />
}
