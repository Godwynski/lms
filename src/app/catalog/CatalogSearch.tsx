'use client'

import { useState, useMemo, useTransition } from 'react'
import Image from 'next/image'
import {
  Search, Book, X, Calendar, Globe, Hash, Layers, Building, AlignLeft,
  SlidersHorizontal, BookMarked, Check, BookOpen, ChevronDown, Plus, Loader2, ListChecks, Star
} from 'lucide-react'
import { addToReadingList, removeFromReadingList } from './readingListActions'
import BookReviews from './BookReviews'

type ReadingList = { id: string; name: string }
type BookType = {
  id: string
  title: string
  author?: string
  isbn?: string
  ddc_call_number?: string
  publisher?: string
  publication_year?: number
  cover_image_url?: string
  description?: string
  available_copies: number
  total_copies: number
  genre?: string
  page_count?: number
  language?: string
  average_rating?: number
  review_count?: number
}

type Props = {
  initialBooks: BookType[]
  readingLists: ReadingList[]
  savedBookIds: string[]
  isLoggedIn: boolean
  currentUserId?: string
}

const AVAILABILITY_OPTIONS = ['All', 'Available', 'Checked Out']
const SORT_OPTIONS = [
  { label: 'Title A–Z', value: 'title_asc' },
  { label: 'Title Z–A', value: 'title_desc' },
  { label: 'Newest First', value: 'year_desc' },
  { label: 'Oldest First', value: 'year_asc' },
]

export default function CatalogSearch({ initialBooks, readingLists, savedBookIds, isLoggedIn, currentUserId }: Props) {
  const [query, setQuery] = useState('')
  const [searchField, setSearchField] = useState<'all' | 'title' | 'author' | 'isbn' | 'ddc'>('all')
  const [availability, setAvailability] = useState('All')
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')
  const [sortBy, setSortBy] = useState('title_asc')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBook, setSelectedBook] = useState<BookType | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(savedBookIds))
  const [listMenuOpen, setListMenuOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [listFeedback, setListFeedback] = useState<string | null>(null)

  // ── Derived filter state ─────────────────────────────────
  const hasActiveFilters = availability !== 'All' || yearFrom || yearTo || sortBy !== 'title_asc'

  const filteredBooks = useMemo(() => {
    let books = [...initialBooks]
    const q = query.trim().toLowerCase()

    if (q) {
      books = books.filter(b => {
        if (searchField === 'title') return b.title?.toLowerCase().includes(q)
        if (searchField === 'author') return b.author?.toLowerCase().includes(q)
        if (searchField === 'isbn') return b.isbn?.toLowerCase().includes(q)
        if (searchField === 'ddc') return b.ddc_call_number?.toLowerCase().includes(q)
        return (
          b.title?.toLowerCase().includes(q) ||
          b.author?.toLowerCase().includes(q) ||
          b.isbn?.includes(q) ||
          b.ddc_call_number?.toLowerCase().includes(q) ||
          b.publisher?.toLowerCase().includes(q)
        )
      })
    }

    if (availability === 'Available') books = books.filter(b => b.available_copies > 0)
    if (availability === 'Checked Out') books = books.filter(b => b.available_copies === 0)
    if (yearFrom) books = books.filter(b => b.publication_year && b.publication_year >= parseInt(yearFrom))
    if (yearTo) books = books.filter(b => b.publication_year && b.publication_year <= parseInt(yearTo))

    books.sort((a, b) => {
      if (sortBy === 'title_asc') return (a.title || '').localeCompare(b.title || '')
      if (sortBy === 'title_desc') return (b.title || '').localeCompare(a.title || '')
      if (sortBy === 'year_desc') return (b.publication_year || 0) - (a.publication_year || 0)
      if (sortBy === 'year_asc') return (a.publication_year || 0) - (b.publication_year || 0)
      return 0
    })

    return books
  }, [initialBooks, query, searchField, availability, yearFrom, yearTo, sortBy])

  const clearFilters = () => {
    setAvailability('All')
    setYearFrom('')
    setYearTo('')
    setSortBy('title_asc')
  }

  const handleAddToList = (listId: string, bookId: string) => {
    startTransition(async () => {
      const alreadySaved = savedIds.has(bookId)
      if (alreadySaved) {
        const res = await removeFromReadingList(bookId, listId)
        if (res.success) {
          setSavedIds(prev => { const s = new Set(prev); s.delete(bookId); return s })
          setListFeedback('Removed from list')
        } else {
          setListFeedback(res.error || 'Error')
        }
      } else {
        const res = await addToReadingList(bookId, listId)
        if (res.success) {
          setSavedIds(prev => new Set(prev).add(bookId))
          setListFeedback('Saved to list!')
        } else {
          setListFeedback(res.error || 'Error')
        }
      }
      setListMenuOpen(false)
      setTimeout(() => setListFeedback(null), 2500)
    })
  }

  return (
    <div className="space-y-6">

      {/* ── Search bar + field selector ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search by ${searchField === 'all' ? 'title, author, ISBN, DDC…' : searchField + '…'}`}
            className="w-full pl-12 pr-4 py-3.5 border border-slate-200 shadow-sm text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-base font-medium transition-all"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Field picker */}
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'title', 'author', 'isbn', 'ddc'] as const).map(f => (
            <button
              key={f}
              onClick={() => setSearchField(f)}
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border ${
                searchField === f
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              {f === 'all' ? 'All' : f === 'ddc' ? 'DDC' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold border transition-all ${
            hasActiveFilters
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-white/80" />}
        </button>
      </div>

      {/* ── Filter Panel ── */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Availability</label>
            <select
              value={availability}
              onChange={e => setAvailability(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {AVAILABILITY_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Year From</label>
            <input
              type="number"
              value={yearFrom}
              onChange={e => setYearFrom(e.target.value)}
              placeholder="e.g. 2000"
              min="1800" max={new Date().getFullYear()}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Year To</label>
            <input
              type="number"
              value={yearTo}
              onChange={e => setYearTo(e.target.value)}
              placeholder="e.g. 2024"
              min="1800" max={new Date().getFullYear()}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sort By</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="col-span-2 sm:col-span-4 text-xs font-bold text-rose-500 hover:text-rose-700 text-center mt-1">
              ✕ Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Results summary ── */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {filteredBooks.length === initialBooks.length
            ? `${initialBooks.length} books in catalog`
            : `${filteredBooks.length} of ${initialBooks.length} books`}
        </span>
        {isLoggedIn && (
          <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
            <ListChecks className="w-4 h-4" />
            {savedIds.size} saved to reading list
          </span>
        )}
      </div>

      {/* ── Toast feedback ── */}
      {listFeedback && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold shadow-xl animate-in slide-in-from-bottom-4 duration-200 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          {listFeedback}
        </div>
      )}

      {/* ── Book Grid ── */}
      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filteredBooks.map((book) => {
            const isSaved = savedIds.has(book.id)
            return (
              <div
                key={book.id}
                className="flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 transition-all group cursor-pointer"
              >
                {/* Cover */}
                <div
                  className="relative aspect-[3/4] bg-slate-50 w-full overflow-hidden flex items-center justify-center p-4"
                  onClick={() => setSelectedBook(book)}
                >
                  {book.cover_image_url ? (
                    <Image
                      src={book.cover_image_url}
                      alt={book.title}
                      fill
                      className="object-contain group-hover:scale-105 transition-transform duration-500 p-3"
                    />
                  ) : (
                    <Book className="w-14 h-14 text-slate-200" />
                  )}
                  <div className="absolute top-2 left-2">
                    {book.available_copies > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        {book.available_copies} avail.
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                        Out
                      </span>
                    )}
                  </div>
                  {/* Save button */}
                  {isLoggedIn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (readingLists.length === 1) {
                          handleAddToList(readingLists[0].id, book.id)
                        } else {
                          setSelectedBook(book)
                          setListMenuOpen(true)
                        }
                      }}
                      className={`absolute bottom-2 right-2 p-1.5 rounded-full transition-all shadow border ${
                        isSaved
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-white/90 text-slate-400 hover:text-indigo-600 border-slate-200 opacity-0 group-hover:opacity-100'
                      }`}
                      title={isSaved ? 'Remove from reading list' : 'Save to reading list'}
                    >
                      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookMarked className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex-1 flex flex-col" onClick={() => setSelectedBook(book)}>
                  <p className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">{book.title}</p>
                  <p className="text-xs text-indigo-600 font-medium mt-0.5 line-clamp-1">{book.author}</p>
                  
                  {book.average_rating !== undefined && book.review_count !== undefined && book.review_count > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span className="text-[11px] font-bold text-slate-700 tabular-nums">{book.average_rating.toFixed(1)}</span>
                      <span className="text-[10px] text-slate-400 font-medium tabular-nums">({book.review_count})</span>
                    </div>
                  )}

                  {book.ddc_call_number && (
                    <p className="text-[10px] text-slate-400 font-mono mt-auto pt-2">{book.ddc_call_number}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500 bg-white rounded-3xl border border-slate-100">
          <Search className="w-10 h-10 text-slate-300 mb-3" />
          <p className="font-semibold text-slate-700">No books found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-4 text-sm font-bold text-indigo-600 hover:text-indigo-800">
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Book Detail Modal ── */}
      {selectedBook && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => { setSelectedBook(null); setListMenuOpen(false) }} />
          <div className="relative bg-white w-full sm:max-w-4xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col md:flex-row rounded-t-3xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">

            <button
              onClick={() => { setSelectedBook(null); setListMenuOpen(false) }}
              className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur-md rounded-full text-slate-500 hover:bg-white border border-slate-200 shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Cover */}
            <div className="w-full md:w-2/5 bg-gradient-to-b from-slate-100 to-slate-50 flex items-center justify-center p-8 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 min-h-[220px] md:min-h-0 relative">
              {selectedBook.cover_image_url ? (
                <div className="relative w-full h-full min-h-[180px] md:min-h-[300px]">
                  <Image
                    src={selectedBook.cover_image_url}
                    alt={selectedBook.title}
                    fill
                    className="object-contain rounded-xl shadow-2xl"
                  />
                </div>
              ) : (
                <BookOpen className="w-24 h-24 text-slate-300" />
              )}
            </div>

            {/* Content */}
            <div className="w-full md:w-3/5 p-6 md:p-10 overflow-y-auto flex flex-col gap-5">
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedBook.available_copies > 0 ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Available ({selectedBook.available_copies}/{selectedBook.total_copies})
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                      Checked Out (0/{selectedBook.total_copies})
                    </span>
                  )}
                  {selectedBook.genre && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {selectedBook.genre.split(',')[0].trim()}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">{selectedBook.title}</h2>
                <p className="text-base font-semibold text-indigo-600 mt-1">{selectedBook.author}</p>
              </div>

              {selectedBook.description && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <AlignLeft className="w-3.5 h-3.5" /> Synopsis
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-sm line-clamp-5">{selectedBook.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-y-3 gap-x-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm">
                {selectedBook.publisher && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5"><Building className="w-3 h-3" />Publisher</span>
                    <span className="font-medium text-slate-800">{selectedBook.publisher}</span>
                  </div>
                )}
                {selectedBook.publication_year && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5"><Calendar className="w-3 h-3" />Year</span>
                    <span className="font-medium text-slate-800">{selectedBook.publication_year}</span>
                  </div>
                )}
                {selectedBook.page_count && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5"><Layers className="w-3 h-3" />Pages</span>
                    <span className="font-medium text-slate-800">{selectedBook.page_count}</span>
                  </div>
                )}
                {selectedBook.language && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5"><Globe className="w-3 h-3" />Language</span>
                    <span className="font-medium text-slate-800 uppercase">{selectedBook.language}</span>
                  </div>
                )}
                {selectedBook.ddc_call_number && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5"><Hash className="w-3 h-3" />DDC</span>
                    <span className="font-mono text-slate-800">{selectedBook.ddc_call_number}</span>
                  </div>
                )}
                {selectedBook.isbn && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5"><Hash className="w-3 h-3" />ISBN</span>
                    <span className="font-mono text-slate-800">{selectedBook.isbn}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-auto flex flex-col gap-3">
                {/* Borrow button */}
                {isLoggedIn && selectedBook.available_copies > 0 && selectedBook.isbn && (
                  <a
                    href={`/self-checkout?isbn=${selectedBook.isbn}`}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98]"
                  >
                    Borrow this Book
                  </a>
                )}

                {/* Reading list button */}
                {isLoggedIn && (
                  <div className="relative">
                    <button
                      onClick={() => setListMenuOpen(!listMenuOpen)}
                      disabled={isPending}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border ${
                        savedIds.has(selectedBook.id)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />}
                      {savedIds.has(selectedBook.id) ? 'Saved to Reading List' : 'Save to Reading List'}
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    </button>
                    {listMenuOpen && readingLists.length > 0 && (
                      <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-10 animate-in slide-in-from-bottom-2 duration-150">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-4 pt-3 pb-1.5">Choose a list</p>
                        {readingLists.map(list => (
                          <button
                            key={list.id}
                            onClick={() => handleAddToList(list.id, selectedBook.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 text-left transition-colors"
                          >
                            <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                              {savedIds.has(selectedBook.id)
                                ? <Check className="w-3.5 h-3.5 text-indigo-600" />
                                : <Plus className="w-3.5 h-3.5 text-indigo-500" />
                              }
                            </div>
                            <span className="font-semibold text-slate-800 text-sm">{list.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Reviews Section */}
              <BookReviews bookId={selectedBook.id} currentUserId={currentUserId} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
