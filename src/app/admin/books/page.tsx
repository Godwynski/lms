import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import AddBookModal from './AddBookModal'
import EditBookModal from './EditBookModal'
import DeleteBookButton from './DeleteBookButton'

export default async function BooksAdminPage() {
  const supabase = await createClient()

  // Verify caller is admin/staff
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role || 'borrower'
  
  if (role !== 'super_admin' && role !== 'librarian' && role !== 'circulation_assistant') {
    redirect('/')
  }

  // Fetch current catalog
  const { data: books, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              Library Inventory
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage the books currently available in your catalog.</p>
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
