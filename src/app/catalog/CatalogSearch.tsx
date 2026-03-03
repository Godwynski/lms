'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  Search, Book, X, Calendar, Globe, Hash, Layers, Building, AlignLeft,
  SlidersHorizontal, BookMarked, Check, BookOpen, ChevronDown, Plus, Loader2, ListChecks, Star, MapPin
} from 'lucide-react'
import { addToReadingList, removeFromReadingList } from './readingListActions'
import BookReviews from './BookReviews'
import { toast } from 'sonner'

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
  shelf_location?: string
  category?: string
}

type Props = {
  initialBooks: BookType[]
  totalCount: number
  currentPage: number
  pageSize: number
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

export default function CatalogSearch({ 
  initialBooks, totalCount, currentPage, pageSize, readingLists, savedBookIds, isLoggedIn, currentUserId 
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // ── URL State ─────────────────────────────────
  const query = searchParams.get('q') || ''
  const searchField = searchParams.get('field') || 'all'
  const availability = searchParams.get('availability') || 'All'
  const yearFrom = searchParams.get('yearFrom') || ''
  const yearTo = searchParams.get('yearTo') || ''
  const sortBy = searchParams.get('sort') || 'title_asc'

  const [showFilters, setShowFilters] = useState(false)
  const [selectedBook, setSelectedBook] = useState<BookType | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(savedBookIds))
  const [listMenuOpen, setListMenuOpen] = useState(false)
  
  const hasActiveFilters = availability !== 'All' || yearFrom || yearTo || sortBy !== 'title_asc'

  // Manage dialog open/close manually alongside selectedBook state
  useEffect(() => {
    if (selectedBook && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal()
      document.body.style.overflow = 'hidden' // prevent body scroll while dialog is open
    } else if (!selectedBook && dialogRef.current && dialogRef.current.open) {
      dialogRef.current.close()
      document.body.style.overflow = 'unset'
    }
    
    // Cleanup on unmount
    return () => { document.body.style.overflow = 'unset' }
  }, [selectedBook])

  // Update URL helper
  const updateUrl = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === '' || (key === 'field' && value === 'all') || (key === 'availability' && value === 'All') || (key === 'sort' && value === 'title_asc')) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  const clearFilters = () => {
    updateUrl({ availability: null, yearFrom: null, yearTo: null, sort: null, page: null })
  }

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: newPage.toString() })
  }

  const handleAddToList = (listId: string, bookId: string) => {
    startTransition(async () => {
      const alreadySaved = savedIds.has(bookId)
      if (alreadySaved) {
        const res = await removeFromReadingList(bookId, listId)
        if (res.success) {
          setSavedIds(prev => { const s = new Set(prev); s.delete(bookId); return s })
          toast.success('Removed from list')
        } else {
          toast.error(res.error || 'Finished processing with errors')
        }
      } else {
        const res = await addToReadingList(bookId, listId)
        if (res.success) {
          setSavedIds(prev => new Set(prev).add(bookId))
          toast.success('Saved to list!')
        } else {
          toast.error(res.error || 'Finished processing with errors')
        }
      }
      setListMenuOpen(false)
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
            onChange={(e) => updateUrl({ q: e.target.value })}
            placeholder={`Search by ${searchField === 'all' ? 'title, author, ISBN, DDC…' : searchField + '…'}`}
            className="w-full pl-12 pr-4 py-3.5 border border-slate-200 shadow-sm text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-base font-medium transition-all"
          />
          {query && (
            <button onClick={() => updateUrl({ q: null })} className="absolute inset-y-0 right-3 flex items-center justify-center min-w-[44px] min-h-[44px] text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Field picker */}
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'title', 'author', 'isbn', 'ddc'] as const).map(f => (
            <button
              key={f}
              onClick={() => updateUrl({ field: f })}
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
          className={`flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-2xl text-sm font-semibold border transition-all ${
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
              onChange={e => updateUrl({ availability: e.target.value })}
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
              onChange={e => updateUrl({ yearFrom: e.target.value })}
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
              onChange={e => updateUrl({ yearTo: e.target.value })}
              placeholder="e.g. 2024"
              min="1800" max={new Date().getFullYear()}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sort By</label>
            <select
              value={sortBy}
              onChange={e => updateUrl({ sort: e.target.value })}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="col-span-2 sm:col-span-4 min-h-[44px] text-xs font-bold text-rose-500 hover:text-rose-700 text-center mt-1">
              ✕ Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Results summary ── */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {totalCount === 0 ? 'No books found' : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} books in catalog`}
        </span>
        {isLoggedIn && (
          <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
            <ListChecks className="w-4 h-4" />
            {savedIds.size} saved to reading list
          </span>
        )}
      </div>

      {/* ── Book Grid ── */}
      {initialBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {initialBooks.map((book) => {
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
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
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
                      className={`absolute bottom-2 right-2 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-all shadow border ${
                        isSaved
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-white/90 text-slate-400 hover:text-indigo-600 border-slate-200 opacity-0 group-hover:opacity-100'
                      } ${!isSaved && 'sm:min-w-0 sm:min-h-0 sm:p-1.5'} `}
                      title={isSaved ? 'Remove from reading list' : 'Save to reading list'}
                    >
                      {isPending ? <Loader2 className={`animate-spin ${!isSaved ? 'w-5 h-5 sm:w-3.5 sm:h-3.5' : 'w-4 h-4'}`} /> : <BookMarked className={`${!isSaved ? 'w-5 h-5 sm:w-3.5 sm:h-3.5' : 'w-4 h-4'}`} />}
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

                  {/* Shelf Location Badge */}
                  {book.shelf_location && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span className="text-[10px] font-semibold text-indigo-600 truncate">{book.shelf_location}</span>
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

      {/* ── Pagination ── */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-center gap-2 pt-6 pb-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isPending}
            className="px-4 py-2 min-h-[44px] min-w-[44px] text-sm font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          <span className="text-sm font-medium text-slate-500 px-2">
            Page {currentPage} of {Math.ceil(totalCount / pageSize)}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= Math.ceil(totalCount / pageSize) || isPending}
            className="px-4 py-2 min-h-[44px] min-w-[44px] text-sm font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      )}

      {/* ── Book Detail Dialog ── */}
      <dialog
        ref={dialogRef}
        onClose={() => { setSelectedBook(null); setListMenuOpen(false) }}
        className="backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm bg-transparent p-0 m-auto w-full sm:max-w-4xl fixed inset-0 z-[200] max-h-[100dvh] open:flex items-end sm:items-center justify-center outline-none"
      >
        {selectedBook && (
          <div className="relative bg-white w-full sm:rounded-3xl shadow-2xl max-h-[calc(100dvh-4rem)] sm:max-h-[90vh] overflow-hidden flex flex-col md:flex-row rounded-t-3xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <button
              onClick={() => { setSelectedBook(null); setListMenuOpen(false) }}
              className="absolute top-4 right-4 z-10 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/80 backdrop-blur-md rounded-full text-slate-500 hover:bg-white border border-slate-200 shadow-sm"
              aria-label="Close dialog"
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
                    sizes="(max-width: 768px) 100vw, 40vw"
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
                {selectedBook.shelf_location && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5"><MapPin className="w-3 h-3" />Shelf Location</span>
                    <span className="font-semibold text-indigo-700">{selectedBook.shelf_location}</span>
                  </div>
                )}
                {selectedBook.category && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5"><Hash className="w-3 h-3" />Category</span>
                    <span className="font-medium text-slate-800">{selectedBook.category}</span>
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
                {/* Borrow notice — borrowing is now librarian-approved at the counter */}
                {isLoggedIn && selectedBook.available_copies > 0 && (
                  <div className="w-full flex items-center gap-3 py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold">
                    <BookOpen className="w-4 h-4 shrink-0 text-emerald-600" />
                    Available — Visit the library counter to borrow
                    {selectedBook.shelf_location && (
                      <span className="ml-auto text-xs font-bold text-indigo-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {selectedBook.shelf_location}
                      </span>
                    )}
                  </div>
                )}
                {isLoggedIn && selectedBook.available_copies === 0 && (
                  <div className="w-full flex items-center gap-3 py-3 px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-sm font-semibold">
                    <Book className="w-4 h-4 shrink-0" />
                    All copies are currently checked out
                  </div>
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
        )}
      </dialog>
    </div>
  )
}
