import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ReadingListsClient from './ReadingListsClient'
import { ArrowLeft, BookMarked } from 'lucide-react'

export default async function ReadingListsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch user's reading lists with their books (nested join)
  const { data: lists } = await supabase
    .from('reading_lists')
    .select(`
      id,
      name,
      created_at,
      reading_list_books (
        id,
        added_at,
        book_id,
        books (
          id, title, author, cover_image_url, available_copies, total_copies, isbn, ddc_call_number
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })


  return (
    <div className="min-h-screen bg-slate-50">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-200/25 blur-[120px]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BookMarked className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Reading Lists</h1>
              <p className="text-sm text-slate-500 font-medium">Books you want to read</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/catalog" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl border border-indigo-100 transition-colors">
              Browse Catalog
            </Link>
            <Link href="/" className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-indigo-600 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Dashboard
            </Link>
          </div>
        </div>

        <ReadingListsClient lists={lists || []} />
      </div>
    </div>
  )
}
