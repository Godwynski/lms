import { getSession } from '@/lib/auth/couchdb'
import PouchDB from 'pouchdb'
import PouchDBFind from 'pouchdb-find'
import Link from 'next/link'
import { ArrowLeft, Library, ListChecks } from 'lucide-react'
import { Suspense } from 'react'
import CatalogSearch, { BookType } from './CatalogSearch'

PouchDB.plugin(PouchDBFind)

export const revalidate = 60 // Cache this page for 1 minute

interface PageProps {
  searchParams: Promise<{
    q?: string
    field?: string
    availability?: string
    yearFrom?: string
    yearTo?: string
    sort?: string
    page?: string
  }>
}

export default async function CatalogPage(props: PageProps) {
  const searchParams = await props.searchParams
  const session = await getSession()
  const user = session?.userCtx?.name ? { id: session.userCtx.name } : null

  const q = searchParams.q || ''
  const field = searchParams.field || 'all'
  const availability = searchParams.availability || 'All'
  const yearFrom = searchParams.yearFrom || ''
  const yearTo = searchParams.yearTo || ''
  const sort = searchParams.sort || 'title_asc'
  const page = parseInt(searchParams.page || '1')
  const pageSize = 20

  const COUCHDB_URL = process.env.NEXT_PUBLIC_COUCHDB_URL || 'http://localhost:5984'
  let books: Record<string, unknown>[] = []
  let count = 0
  let error = null

  try {
    const db = new PouchDB(`${COUCHDB_URL}/lms`, { skip_setup: true })
    
    // We construct a query selector based on Mango queries
    const selector: Record<string, unknown> = { type: 'book' }
    
    // Text search
    if (q) {
      if (field === 'title') {
        selector.title = { $regex: new RegExp(q, 'i') }
      } else if (field === 'author') {
        selector.author = { $regex: new RegExp(q, 'i') }
      } else if (field === 'isbn') {
        selector.isbn = { $regex: new RegExp(q, 'i') }
      } else if (field === 'ddc') {
        selector.ddc_call_number = { $regex: new RegExp(q, 'i') }
      } else {
        // 'all' case - PouchDB regex on multiple fields in a single query can be complex,
        // we'll fetch all books and filter in memory if it's 'all' to be safe for now
        // This is a tradeoff for no-sql, for large datasets we need a full-text search engine like CouchDB Lucene
      }
    }

    // Availability
    if (availability === 'Available') {
      selector.available_copies = { $gt: 0 }
    } else if (availability === 'Checked Out') {
      selector.available_copies = { $eq: 0 }
    }

    // Year filters
    if (yearFrom || yearTo) {
      const yearFilter: Record<string, number> = {}
      if (yearFrom) yearFilter.$gte = parseInt(yearFrom)
      if (yearTo) yearFilter.$lte = parseInt(yearTo)
      selector.publication_year = yearFilter
    }

    // Get the results
    const result = await db.find({
      selector,
      limit: q && field === 'all' ? 1000 : pageSize, // If searching 'all', pull more and filter locally
      skip: q && field === 'all' ? 0 : (page - 1) * pageSize,
      // Sorting requires indexes properly created, so we will sort in memory for now
      // to ensure no CouchDB indexing errors for the user
    })

    books = result.docs as unknown as Record<string, unknown>[]

    // Filter "all" columns in memory as a polyfill for 'OR' regexes in CouchDB
    if (q && field === 'all') {
      const lowerQ = q.toLowerCase()
      books = books.filter((b) => {
        const title = String(b.title || '')
        const author = String(b.author || '')
        const isbn = String(b.isbn || '')
        const ddc = String(b.ddc_call_number || '')
        const publisher = String(b.publisher || '')
        return title.toLowerCase().includes(lowerQ) ||
               author.toLowerCase().includes(lowerQ) ||
               isbn.toLowerCase().includes(lowerQ) ||
               ddc.toLowerCase().includes(lowerQ) ||
               publisher.toLowerCase().includes(lowerQ)
      })
    }

    // In-memory sorting as polyfill
    if (sort === 'title_asc') books.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
    else if (sort === 'title_desc') books.sort((a, b) => String(b.title || '').localeCompare(String(a.title || '')))
    else if (sort === 'year_desc') books.sort((a, b) => Number(b.publication_year || 0) - Number(a.publication_year || 0))
    else if (sort === 'year_asc') books.sort((a, b) => Number(a.publication_year || 0) - Number(b.publication_year || 0))

    // Manual limit if we fetched all for memory filtering
    if (q && field === 'all') {
      books = books.slice((page - 1) * pageSize, page * pageSize)
    }

    // Since we don't have exact count easily in Mongo queries without fetching all, we approximate
    count = books.length === pageSize ? page * pageSize + 1 : (page - 1) * pageSize + books.length

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('Failed to fetch from CouchDB:', errorMsg)
    error = errorMsg
  }

  // Fetch reading lists + saved book IDs for the logged-in user
  let readingLists: { id: string; name: string }[] = []
  let savedBookItems: { book_id: string; list_id: string }[] = []

  if (user && !error) {
    try {
      const db = new PouchDB(`${COUCHDB_URL}/lms`, { skip_setup: true })
      
      const listsRes = await db.find({
        selector: { type: 'reading_list', user_id: user.id }
      })
      readingLists = listsRes.docs.map((d) => { const doc = d as unknown as Record<string, unknown>; return { id: String(doc._id), name: String(doc.name) } })

      if (readingLists.length > 0) {
        const listIds = readingLists.map(l => l.id)
        const itemsRes = await db.find({
          selector: { 
            type: 'reading_list_book', 
            list_id: { $in: listIds }
          }
        })
        savedBookItems = itemsRes.docs.map((d) => { const doc = d as unknown as Record<string, unknown>; return { book_id: String(doc.book_id), list_id: String(doc.list_id) } })
      }
    } catch (err) {
      console.error('Failed to fetch reading lists:', err)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-500/30">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-200/30 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-200/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Library className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Library Catalog</h1>
              <p className="text-sm text-slate-500 font-medium">Browse and search {count > 0 ? (count === pageSize ? `${count}+` : count) : 0} books</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <Link href="/reading-lists" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl border border-indigo-100 transition-colors">
                <ListChecks className="w-4 h-4" />
                My Reading Lists
              </Link>
            )}
            <Link href="/" className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </div>
        </div>

        {error ? (
          <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-medium">
            Failed to load catalog data. Is your CouchDB instance running?
          </div>
        ) : (
          <Suspense fallback={
            <div className="animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="h-12 bg-slate-200 rounded-xl animate-pulse w-full md:w-[40%]" />
                <div className="h-12 bg-slate-200 rounded-xl animate-pulse w-full md:w-[15%]" />
                <div className="h-12 bg-slate-200 rounded-xl animate-pulse w-full md:w-[20%]" />
                <div className="h-12 bg-slate-200 rounded-xl animate-pulse w-full md:w-[20%]" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col gap-3">
                    <div className="w-full aspect-[2/3] bg-slate-200 rounded-xl animate-pulse" />
                    <div className="space-y-2 mt-2">
                       <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
                       <div className="h-3 bg-slate-200 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }>
            <CatalogSearch
              initialBooks={(books as unknown as BookType[]) || []}
              totalCount={count || 0}
              currentPage={page}
              pageSize={pageSize}
              readingLists={readingLists}
              savedBookItems={savedBookItems}
              isLoggedIn={!!user}
              currentUserId={user?.id}
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}
