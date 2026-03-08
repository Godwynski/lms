import { getSession, getAdminDb } from '@/lib/auth/couchdb'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ScanLine } from 'lucide-react'
import { getAllBooksForAudit } from './actions'
import AuditClient from './AuditClient'



const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']

export const metadata = {
  title: 'Audit Mode — LMS Admin',
}

export default async function AuditPage() {
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

  const allBooks = await getAllBooksForAudit()

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[55%] h-[55%] rounded-full bg-violet-200/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-200/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <ScanLine className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Audit Mode</h1>
              <p className="text-sm text-slate-500">{allBooks.length} books loaded · Scan to verify shelf inventory</p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-indigo-600 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Dashboard
          </Link>
        </div>

        <AuditClient allBooks={allBooks} />
      </div>
    </div>
  )
}
