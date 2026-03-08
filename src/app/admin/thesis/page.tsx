import { getSession, getAdminDb } from '@/lib/auth/couchdb'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpenText } from 'lucide-react'
import ThesisAdminClient from './ThesisAdminClient'
import type { Thesis } from '@/app/thesis/ThesisClient'


const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']

export default async function AdminThesisPage() {
  const session = await getSession()
  const userId = session?.userCtx?.name
  if (!userId) redirect('/login')

  const roles = session?.userCtx?.roles || []
  let hasAccess = STAFF_ROLES.some(r => roles.includes(r))
  
  const db = await getAdminDb()

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

  let thesisList: Thesis[] = []
  try {
    const res = await db.find({ selector: { type: 'thesis' } })
    thesisList = (res.docs as unknown as (Record<string, unknown> & { _id: string })[]).map(doc => ({
      id: doc._id,
      title: String(doc.title ?? ''),
      author: String(doc.author ?? ''),
      course: doc.course != null ? String(doc.course) : null,
      publication_year: doc.publication_year != null ? Number(doc.publication_year) : null,
      abstract: doc.abstract != null ? String(doc.abstract) : null,
      pdf_url: doc.pdf_url != null ? String(doc.pdf_url) : null,
      created_at: String(doc.created_at ?? new Date().toISOString()),
    })).sort((a, b) => Number(b.publication_year ?? 0) - Number(a.publication_year ?? 0))
  } catch {
    // Non-critical: fall through, thesisList stays empty
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-200/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <BookOpenText className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Manage Thesis</h1>
              <p className="text-sm text-slate-500">Add, edit, or remove research papers from the explorer.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href="/thesis"
              className="inline-flex items-center text-sm font-semibold text-violet-600 hover:text-violet-800 bg-violet-50 px-4 py-2.5 rounded-xl border border-violet-100 transition-colors"
            >
              <BookOpenText className="w-4 h-4 mr-2" aria-hidden="true" />
              View Explorer
            </Link>
            <Link
              href="/"
              className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-indigo-600 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              Dashboard
            </Link>
          </div>
        </div>

        <ThesisAdminClient thesisList={thesisList ?? []} />
      </div>
    </div>
  )
}
