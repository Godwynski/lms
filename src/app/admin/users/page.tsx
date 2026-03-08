import { getSession, getAdminDb } from '@/lib/auth/couchdb'
import { redirect } from 'next/navigation'
import UsersClient from './UsersClient'


export default async function UsersPage() {
  const session = await getSession()
  const userId = session?.userCtx?.name
  if (!userId) redirect('/login')

  const db = await getAdminDb()

  type ProfileDoc = Record<string, unknown> & { _id: string }
  const profileDocs = await db.find({ selector: { type: 'profile', user_id: userId } })
  const profile = profileDocs.docs[0] as unknown as ProfileDoc | undefined

  const roles = session?.userCtx?.roles || []
  let hasAccess = ['super_admin', 'librarian', 'circulation_assistant'].some(r => roles.includes(r))
  if (!hasAccess && profile && ['super_admin', 'librarian', 'circulation_assistant'].includes(String(profile.role ?? ''))) {
    hasAccess = true
  }

  if (!hasAccess) {
    redirect('/')
  }

  const allProfilesRes = await db.find({ selector: { type: 'profile' } })
  
  const mergedUsers = (allProfilesRes.docs as unknown as ProfileDoc[]).map((p) => ({
    id: String(p.user_id ?? ''), // we map CouchDB user name / id to this
    email: String(p.email ?? p.user_id ?? ''),
    full_name: String(p.full_name ?? 'Unknown'),
    role: String(p.role ?? 'borrower'),
    student_number: p.student_number != null ? String(p.student_number) : null,
    created_at: String(p.created_at ?? new Date().toISOString()),
    last_sign_in_at: p.last_sign_in_at != null ? String(p.last_sign_in_at) : null,
  }))

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-12">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-200/30 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto">
         <UsersClient profiles={mergedUsers} currentUserRole={profile?.role != null ? String(profile.role) : 'librarian'} />
      </div>
    </div>
  )
}
