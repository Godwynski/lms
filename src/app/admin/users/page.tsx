import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import UsersClient from './UsersClient'

export default async function UsersPage() {
  const supabase = await createClient()
  
  // 1. Authenticate Request
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Authorize Request (Admin/Staff only)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  
  if (!profile || !['super_admin', 'librarian', 'circulation_assistant'].includes(profile.role)) {
    redirect('/')
  }

  // 3. Fetch ALL auth users via the Admin API (Service Role) — this is authoritative
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000,
  })
  
  if (authError) {
    console.error('Failed to load auth users:', authError)
  }

  // 4. Also fetch profiles for extra info (role, full_name, student_number)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, email, created_at, student_number')

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))

  // 5. Merge: for every auth user, attach profile data (or defaults)
  const mergedUsers = (authUsers || []).map(authUser => {
    const p = profileMap.get(authUser.id)
    return {
      id: authUser.id,
      email: authUser.email || '',
      full_name: p?.full_name || authUser.user_metadata?.full_name || null,
      role: p?.role || authUser.user_metadata?.role || 'borrower',
      student_number: p?.student_number || null,
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at || null,
    }
  })


  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-12">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-200/30 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto">
         <UsersClient profiles={mergedUsers} currentUserRole={profile.role} />
      </div>
    </div>
  )
}
