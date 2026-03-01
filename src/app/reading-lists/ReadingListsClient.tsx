'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  BookOpen, Plus, Trash2, X, Check, Loader2, BookMarked
} from 'lucide-react'
import { createReadingList, deleteReadingList, removeFromReadingList } from '../catalog/readingListActions'

type Book = {
  id: string
  title: string
  author?: string
  cover_image_url?: string | null
  available_copies: number
  total_copies: number
  isbn?: string
  ddc_call_number?: string
}

type ListBook = {
  id: string
  added_at: string
  book_id: string
  books: Book[]
}

type ReadingList = {
  id: string
  name: string
  created_at: string
  reading_list_books: ListBook[]
}

export default function ReadingListsClient({ lists: initialLists }: { lists: ReadingList[] }) {
  const [lists, setLists] = useState(initialLists)
  const [isCreating, setIsCreating] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [confirmDeleteList, setConfirmDeleteList] = useState<string | null>(null)

  const toast = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 2500)
  }

  const handleCreateList = () => {
    if (!newListName.trim()) return
    startTransition(async () => {
      const res = await createReadingList(newListName.trim())
      if (res.success && res.list) {
        setLists(prev => [...prev, { ...res.list, reading_list_books: [] }])
        setNewListName('')
        setIsCreating(false)
        toast('Reading list created!')
      } else {
        toast(res.error || 'Error creating list')
      }
    })
  }

  const handleDeleteList = (listId: string) => {
    startTransition(async () => {
      const res = await deleteReadingList(listId)
      if (res.success) {
        setLists(prev => prev.filter(l => l.id !== listId))
        setConfirmDeleteList(null)
        toast('List deleted')
      } else {
        toast(res.error || 'Error deleting list')
      }
    })
  }

  const handleRemoveBook = (listId: string, bookId: string) => {
    startTransition(async () => {
      const res = await removeFromReadingList(bookId, listId)
      if (res.success) {
        setLists(prev => prev.map(l =>
          l.id === listId
            ? { ...l, reading_list_books: l.reading_list_books.filter(lb => lb.book_id !== bookId) }
            : l
        ))
        toast('Book removed from list')
      } else {
        toast(res.error || 'Error removing book')
      }
    })
  }

  const totalSaved = lists.reduce((s, l) => s + l.reading_list_books.length, 0)

  return (
    <div className="space-y-6">

      {/* Toast */}
      {feedback && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-200">
          <Check className="w-4 h-4 text-emerald-400" /> {feedback}
        </div>
      )}

      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          <span className="font-bold text-slate-700">{totalSaved}</span> book{totalSaved !== 1 ? 's' : ''} saved across <span className="font-bold text-slate-700">{lists.length}</span> list{lists.length !== 1 ? 's' : ''}
        </p>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> New List
          </button>
        )}
      </div>

      {/* Create new list */}
      {isCreating && (
        <div className="bg-white border border-indigo-200 rounded-2xl p-4 flex gap-3 items-center shadow-sm animate-in slide-in-from-top-2 duration-150">
          <input
            autoFocus
            type="text"
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateList()}
            placeholder="List name (e.g. &quot;Science Books&quot;, &quot;Must Read&quot;)"
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={handleCreateList}
            disabled={!newListName.trim() || isPending}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
          </button>
          <button onClick={() => { setIsCreating(false); setNewListName('') }} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Lists */}
      {lists.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-14 text-center">
          <BookMarked className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold text-lg">No reading lists yet</p>
          <p className="text-slate-400 text-sm mt-1">Create a list and save books from the catalog to keep track of what you want to read.</p>
          <Link href="/catalog" className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20">
            Browse Catalog
          </Link>
        </div>
      ) : (
        lists.map(list => (
          <div key={list.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* List header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <BookMarked className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">{list.name}</h2>
                  <p className="text-xs text-slate-400">{list.reading_list_books.length} book{list.reading_list_books.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/catalog" className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                  + Add Books
                </Link>
                <button
                  onClick={() => setConfirmDeleteList(list.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete list"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Delete confirmation */}
            {confirmDeleteList === list.id && (
              <div className="px-5 py-3 bg-rose-50 border-b border-rose-100 flex items-center justify-between gap-4 animate-in slide-in-from-top-1 duration-150">
                <p className="text-sm font-semibold text-rose-700">Delete &ldquo;{list.name}&rdquo;? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDeleteList(null)} className="text-sm px-3 py-1.5 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                  <button onClick={() => handleDeleteList(list.id)} disabled={isPending} className="text-sm px-3 py-1.5 rounded-lg font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-colors">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                  </button>
                </div>
              </div>
            )}

            {/* Books in list */}
            {list.reading_list_books.length === 0 ? (
              <div className="p-8 text-center">
                <BookOpen className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm font-medium">No books in this list yet.</p>
                <Link href="/catalog" className="text-xs font-bold text-indigo-500 hover:text-indigo-700 mt-1 inline-block">Browse the catalog →</Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {list.reading_list_books.map(lb => {
                  const book = Array.isArray(lb.books) ? lb.books[0] : lb.books as unknown as Book
                  if (!book) return null
                  return (
                    <div key={lb.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors group">
                      {/* Cover thumbnail */}
                      <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
                        {book.cover_image_url ? (
                          <Image src={book.cover_image_url} alt={book.title} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-slate-300" />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{book.title}</p>
                        <p className="text-xs text-slate-500 truncate">{book.author}</p>
                        {book.ddc_call_number && (
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">{book.ddc_call_number}</p>
                        )}
                      </div>
                      {/* Availability */}
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        book.available_copies > 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {book.available_copies > 0 ? `${book.available_copies} avail.` : 'Out'}
                      </span>
                      {/* Borrow Shortcut */}
                      {book.available_copies > 0 && book.isbn && (
                        <Link
                          href={`/self-checkout?isbn=${book.isbn}`}
                          className="shrink-0 text-xs font-bold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                          title="Borrow now"
                        >
                          Borrow
                        </Link>
                      )}
                      {/* Remove */}
                      <button
                        onClick={() => handleRemoveBook(list.id, book.id)}
                        disabled={isPending}
                        className="shrink-0 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove from list"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
