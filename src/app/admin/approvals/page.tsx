import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bookmark, ArrowLeft } from 'lucide-react'
import ApprovalsClient from './ApprovalsClient'

export default async function ApprovalsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'librarian', 'circulation_assistant'].includes(profile.role)) {
    redirect('/')
  }

  // Fetch pending requests with details
  const { data: pendingRequests } = await supabase
    .from('borrowing_records')
    .select(`
      id,
      status,
      borrowed_date,
      book_id,
      books ( id, title, author, cover_image_url, isbn ),
      borrower_id,
      profiles:borrower_id ( full_name, email, student_number )
    `)
    .in('status', ['pending', 'pending_return'])
    .order('borrowed_date', { ascending: true })

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-200/50 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-200/40 blur-[120px]" />
      </div>

      <div className="relative z-10 p-6 sm:p-12">
        <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200/50 shadow-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center space-x-2 text-indigo-600 bg-indigo-50/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-indigo-100 shadow-sm">
            <Bookmark className="w-5 h-5 text-indigo-500" />
            <span className="text-sm font-semibold capitalize">Borrow Approvals</span>
          </div>
        </div>

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <ApprovalsClient initialRequests={(pendingRequests as any) || []} />
      </div>
    </div>
  )
}
