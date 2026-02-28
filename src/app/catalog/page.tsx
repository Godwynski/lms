import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Library } from 'lucide-react'
import CatalogSearch from './CatalogSearch'

export default async function CatalogPage() {
  const supabase = await createClient()

  // Fetch all books (In a real app, this should be paginated)
  const { data: books, error } = await supabase
    .from('books')
    .select('*')
    .order('title', { ascending: true })

  const safeBooks = books || []

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-200/40 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-200/30 blur-[120px]" />
      </div>

      <div className="relative z-10 p-6 sm:p-12 mb-10">
        <div className="max-w-7xl mx-auto mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
             <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center p-[2px] shadow-lg shadow-indigo-500/20">
               <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                 <Library className="w-6 h-6 text-indigo-500" />
               </div>
             </div>
             <div>
               <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Library Catalog</h1>
               <p className="text-sm text-slate-500 font-medium mt-1">Browse and reserve books from our collection</p>
             </div>
          </div>

          <Link href="/" className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors bg-white/70 backdrop-blur-md px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <div className="max-w-7xl mx-auto">
          {error ? (
            <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-medium">
              Failed to load catalog data. Please try again later.
            </div>
          ) : (
            <CatalogSearch initialBooks={safeBooks} />
          )}
        </div>
      </div>
    </div>
  )
}
