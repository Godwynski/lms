import { createClient } from '@/utils/supabase/server'
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

  // 3. Fetch Data for Table
  // Sorting by created_at descending (newest first)
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to load profiles:', error)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-12">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-200/30 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto">
         <UsersClient profiles={profiles || []} currentUserRole={profile.role} />
      </div>
    </div>
  )
}
