/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { usePouchDb } from '@/lib/pouchdb/PouchDBProvider'
import ReadingListsClient from './ReadingListsClient'
import type { ReadingList, ListBook, Book } from './ReadingListsClient'
import { BookMarked } from 'lucide-react'

export default function ReadingListsLoader({ userId }: { userId: string }) {
  const db = usePouchDb()
  const [lists, setLists] = useState<ReadingList[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    const fetchData = async () => {
      try {
        const [listsRes, listBooksRes, booksRes] = await Promise.all([
          db.find({ 
            selector: { type: 'reading_list', user_id: userId } 
          }),
          db.find({ selector: { type: 'reading_list_book' } }),
          db.find({ selector: { type: 'book' } })
        ])

        const booksMap = new Map<string, any>(booksRes.docs.map((b: any) => [b._id, b]))
        
        // Group list_books by list_id
        const listBooksMap = new Map<string, any[]>()
        listBooksRes.docs.forEach((lb: any) => {
          const listId = lb.list_id
          if (!listBooksMap.has(listId)) {
            listBooksMap.set(listId, [])
          }
          listBooksMap.get(listId)!.push(lb)
        })

        const mappedLists: ReadingList[] = listsRes.docs.map((listDoc: any) => {
          const listBooks = listBooksMap.get(listDoc._id) || []
          
          // Map to the nested shape component expects
          const mappedListBooks: ListBook[] = listBooks.map(lb => {
            const b = booksMap.get(lb.book_id)
            const book: Book | undefined = b ? {
              id: b._id,
              title: b.title || '',
              author: b.author,
              cover_image_url: b.cover_image_url,
              available_copies: b.available_copies ?? 0,
              total_copies: b.total_copies ?? 0,
              isbn: b.isbn,
              ddc_call_number: b.ddc_call_number,
            } : undefined

            return {
              id: lb._id,
              added_at: lb.added_at,
              book_id: lb.book_id,
              books: book ? [book] : [],
            }
          })
          
          // Sort list books by added date
          mappedListBooks.sort((a, b) => a.added_at.localeCompare(b.added_at))

          return {
            id: listDoc._id,
            name: listDoc.name,
            created_at: listDoc.created_at,
            reading_list_books: mappedListBooks
          }
        })

        mappedLists.sort((a, b) => a.created_at.localeCompare(b.created_at))

        if (active) {
          setLists(mappedLists)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('ReadingLists Loader Error:', err)
        if (active) setIsLoading(false)
      }
    }

    fetchData()
    const changes = db.changes({ since: 'now', live: true }).on('change', fetchData)

    return () => {
      active = false
      changes.cancel()
    }
  }, [db, userId])

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

  return <ReadingListsClient lists={lists} userId={userId} />
}
