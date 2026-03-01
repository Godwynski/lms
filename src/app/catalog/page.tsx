import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Library, ListChecks } from 'lucide-react'
import CatalogSearch from './CatalogSearch'

interface RawBook {
  book_reviews?: { rating: number }[]
  [key: string]: unknown
}

export default async function CatalogPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all books with their ratings
  const { data: rawBooks, error } = await supabase
    .from('books')
    .select('*, book_reviews(rating)')
    .order('title', { ascending: true })

  // Fetch reading lists + saved book IDs for the logged-in user
  let readingLists: { id: string; name: string }[] = []
  let savedBookIds: string[] = []

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
        .select('book_id')
        .in('list_id', listIds)

      savedBookIds = (listBooks || []).map(lb => lb.book_id)
    }
  }

  // Pre-calculate average ratings
  const books = (rawBooks || []).map((b: RawBook) => {
    let avg = 0
    let count = 0
    if (b.book_reviews && b.book_reviews.length > 0) {
      count = b.book_reviews.length
      const sum = b.book_reviews.reduce((acc: number, r: { rating: number }) => acc + r.rating, 0)
      avg = sum / count
    }
    const bookRet = { ...b } as Record<string, unknown>
    delete bookRet.book_reviews
    bookRet.average_rating = avg
    bookRet.review_count = count
    
    // We cast it to match the BookType expected by CatalogSearch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return bookRet as any
  })

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
          <CatalogSearch
            initialBooks={books || []}
            readingLists={readingLists}
            savedBookIds={savedBookIds}
            isLoggedIn={!!user}
            currentUserId={user?.id}
          />
        )}
      </div>
    </div>
  )
}
