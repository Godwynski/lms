import { getSession, getAdminDb } from '@/lib/auth/couchdb'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import CheckoutClient from './CheckoutClient'



export default async function CheckoutPage() {
  const session = await getSession()
  const userId = session?.userCtx?.name
  if (!userId) redirect('/login')

  const db = await getAdminDb()
  const roles = session?.userCtx?.roles || []
  let hasAccess = ['super_admin', 'librarian', 'circulation_assistant'].some(r => roles.includes(r))
  let roleDisplay = roles[0] || 'staff'

  if (!hasAccess) {
    try {
      const profileDocs = await db.find({ selector: { type: 'profile', user_id: userId } })
      if (profileDocs.docs.length > 0) {
        const profile = profileDocs.docs[0] as unknown as Record<string, unknown>
        if (['super_admin', 'librarian', 'circulation_assistant'].includes(String(profile.role ?? ''))) {
          hasAccess = true
          roleDisplay = String(profile.role ?? 'staff')
        }
      }
    } catch {
      // Non-critical: fall through
    }
  }

  if (!hasAccess) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-200/50 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-200/40 blur-[120px]" />
      </div>

      <div className="relative z-10 p-6 sm:p-12">
        <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200/50 shadow-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center space-x-2 text-slate-600 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200/50 shadow-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-semibold capitalize">{roleDisplay.replace('_', ' ')} Access</span>
          </div>
        </div>

        <CheckoutClient />
      </div>
    </div>
  )
}
