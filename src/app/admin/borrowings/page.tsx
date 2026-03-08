import { getSession, getAdminDb } from '@/lib/auth/couchdb'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookMarked } from 'lucide-react'
import BorrowingsLoader from './BorrowingsLoader'

export type BorrowingRecord = {
  id: string
  status: string
  borrowed_date: string
  due_date: string
  returned_date: string | null
  book_id: string
  borrower_id: string
  books?: {
    id: string
    title: string
    author: string | null
    isbn: string
    cover_image_url: string | null
  }
  profiles?: {
    full_name: string | null
    email: string
    student_number: string | null
  }
}



export const metadata = {
  title: 'All Borrowings – Admin | LMS',
}

const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']

export default async function AdminBorrowingsPage() {
  const session = await getSession()
  const userId = session?.userCtx?.name
  if (!userId) redirect('/login')

  const db = await getAdminDb()
  const roles = session?.userCtx?.roles || []
  let hasAccess = STAFF_ROLES.some(r => roles.includes(r))

  if (!hasAccess) {
    try {
      const profileDocs = await db.find({ selector: { type: 'profile', user_id: userId } })
      if (profileDocs.docs.length > 0 && STAFF_ROLES.includes(String((profileDocs.docs[0] as unknown as Record<string, unknown>)?.role ?? ''))) {
        hasAccess = true
      }
    } catch {
      // Non-critical: fall through
    }
  }

  if (!hasAccess) redirect('/')

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-500/30 overflow-hidden relative pb-20">
      {/* Background blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[55%] h-[55%] rounded-full bg-indigo-200/40 blur-[130px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[55%] h-[55%] rounded-full bg-amber-200/30 blur-[130px]" />
      </div>

      <div className="relative z-10 p-6 sm:p-10">
        {/* Top bar */}
        <div className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors bg-white/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200/50 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Dashboard
          </Link>

          <div className="flex items-center gap-2 text-amber-700 bg-amber-50/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-amber-100 shadow-sm">
            <BookMarked className="w-5 h-5 text-amber-500" aria-hidden="true" />
            <span className="text-sm font-semibold">All Borrowings</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Borrowing data sourced from local PouchDB */}
          <BorrowingsLoader />
        </div>
      </div>
    </div>
  )
}

