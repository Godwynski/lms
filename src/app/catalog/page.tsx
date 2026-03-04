import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Library, ListChecks } from 'lucide-react'
import { Suspense } from 'react'
import CatalogSearch from './CatalogSearch'

export const revalidate = 3600 // Cache this page for 1 hour
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
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const q = searchParams.q || ''
  const field = searchParams.field || 'all'
  const availability = searchParams.availability || 'All'
  const yearFrom = searchParams.yearFrom || ''
  const yearTo = searchParams.yearTo || ''
  const sort = searchParams.sort || 'title_asc'
  const page = parseInt(searchParams.page || '1')
  const pageSize = 20

  // Build the Supabase query dynamically
  let bookQuery = supabase.from('books').select('*', { count: 'exact' })

  // 1. Text Search
  if (q) {
    if (field === 'title') bookQuery = bookQuery.ilike('title', `%${q}%`)
    else if (field === 'author') bookQuery = bookQuery.ilike('author', `%${q}%`)
    else if (field === 'isbn') bookQuery = bookQuery.ilike('isbn', `%${q}%`)
    else if (field === 'ddc') bookQuery = bookQuery.ilike('ddc_call_number', `%${q}%`)
    else {
      // 'all' case using GIN indexes if possible, but fallback to or() for now
      bookQuery = bookQuery.or(`title.ilike.%${q}%,author.ilike.%${q}%,isbn.ilike.%${q}%,ddc_call_number.ilike.%${q}%,publisher.ilike.%${q}%`)
    }
  }

  // 2. Availability Filters
  if (availability === 'Available') {
    bookQuery = bookQuery.gt('available_copies', 0)
  } else if (availability === 'Checked Out') {
    bookQuery = bookQuery.eq('available_copies', 0)
  }

  // 3. Year Filters
  if (yearFrom) bookQuery = bookQuery.gte('publication_year', parseInt(yearFrom))
  if (yearTo) bookQuery = bookQuery.lte('publication_year', parseInt(yearTo))

  // 4. Sorting
  if (sort === 'title_asc') bookQuery = bookQuery.order('title', { ascending: true })
  else if (sort === 'title_desc') bookQuery = bookQuery.order('title', { ascending: false })
  else if (sort === 'year_desc') bookQuery = bookQuery.order('publication_year', { ascending: false })
  else if (sort === 'year_asc') bookQuery = bookQuery.order('publication_year', { ascending: true })

  // 5. Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  bookQuery = bookQuery.range(from, to)

  // Execute query
  const { data: books, error, count } = await bookQuery

  // Fetch reading lists + saved book IDs for the logged-in user
  let readingLists: { id: string; name: string }[] = []
  let savedBookItems: { book_id: string; list_id: string }[] = []

  if (user) {
    const { data: lists } = await supabase
      .from('reading_lists')
      .select('id, name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    readingLists = lists || []

    if (readingLists.length > 0) {
      const listIds = readingLists.map(l => l.id)
      const { data: listBooks } = await supabase
        .from('reading_list_books')
        .select('book_id, list_id')
        .in('list_id', listIds)

      savedBookItems = listBooks || []
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
              <p className="text-sm text-slate-500 font-medium">Browse and search {books?.length || 0} books</p>
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
            Failed to load catalog data. Please try again later.
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
              initialBooks={books || []}
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
