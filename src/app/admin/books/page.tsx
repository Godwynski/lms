import { getSession, getAdminDb } from '@/lib/auth/couchdb'
import { redirect } from 'next/navigation'
// import { BookOpen } from 'lucide-react'
import AddBookModal from './AddBookModal'
import EditBookModal from './EditBookModal'
import DeleteBookButton from './DeleteBookButton'



export default async function BooksAdminPage() {
  const session = await getSession()
  const userId = session?.userCtx?.name
  if (!userId) redirect('/login')

  const db = await getAdminDb()
  const roles = session?.userCtx?.roles || []
  let role = roles[0] || 'borrower'

  if (!['super_admin', 'librarian', 'circulation_assistant'].some(r => roles.includes(r))) {
    try {
      const profileDocs = await db.find({ selector: { type: 'profile', user_id: userId } })
      if (profileDocs.docs.length > 0) {
        const firstDoc = profileDocs.docs[0] as unknown as Record<string, unknown>
        role = String(firstDoc?.role ?? 'borrower')
      }
    } catch {
      // Non-critical: fall through
    }
  }
  
  if (role !== 'super_admin' && role !== 'librarian' && role !== 'circulation_assistant') {
    redirect('/')
  }

  type BookRow = {
    id: string
    title: string
    author: string | null
    isbn: string | null
    publisher: string | null
    publication_year: number | null
    description: string | null
    cover_image_url: string | null
    total_copies: number
    available_copies: number
    ddc_call_number: string | null
    genre: string | null
    page_count: number | null
    language: string | null
    created_at?: string
  }
  let books: BookRow[] = []
  let error: string | null = null
  try {
    const res = await db.find({ 
      selector: { type: 'book' }
    })
    books = (res.docs as unknown as (Record<string, unknown> & { _id: string })[]).map(doc => ({
      id: doc._id,
      title: String(doc.title ?? ''),
      author: doc.author != null ? String(doc.author) : null,
      isbn: doc.isbn != null ? String(doc.isbn) : null,
      publisher: doc.publisher != null ? String(doc.publisher) : null,
      publication_year: doc.publication_year != null ? Number(doc.publication_year) : null,
      description: doc.description != null ? String(doc.description) : null,
      cover_image_url: doc.cover_image_url != null ? String(doc.cover_image_url) : null,
      total_copies: Number(doc.total_copies ?? 0),
      available_copies: Number(doc.available_copies ?? 0),
      ddc_call_number: doc.ddc_call_number != null ? String(doc.ddc_call_number) : null,
      genre: doc.genre != null ? String(doc.genre) : null,
      page_count: doc.page_count != null ? Number(doc.page_count) : null,
      language: doc.language != null ? String(doc.language) : null,
      created_at: doc.created_at != null ? String(doc.created_at) : undefined,
    })).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : String(err)
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Library Inventory
            </h1>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-2">Manage the books currently available in your catalog.</h2>
          </div>
          
          <AddBookModal />
        </div>

        {/* Catalog Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-600">Title</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Author</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">ISBN</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-right">Available / Total</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {error || !books || books.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No books found in the inventory.
                    </td>
                  </tr>
                ) : (
                  books.map((book) => (
                    <tr key={book.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 truncate max-w-[300px]" title={book.title}>
                        {book.title}
                      </td>
                      <td className="px-6 py-4 text-slate-600 truncate max-w-[200px]" title={book.author || 'Unknown'}>
                        {book.author || '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                        {book.isbn || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tabular-nums ${
                          book.available_copies > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {book.available_copies} / {book.total_copies}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-nowrap items-center justify-end gap-1">
                          <EditBookModal book={book} />
                          <DeleteBookButton 
                            bookId={book.id} 
                            title={book.title} 
                            canDelete={book.available_copies === book.total_copies} 
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
