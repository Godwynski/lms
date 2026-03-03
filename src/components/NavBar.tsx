import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import NavClient from './NavClient'

export default async function NavBar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null // Don't show navbar if not logged in
  }

  let profile = null
  if (user) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (error) console.error('NavBar Profile Fetch Error:', error)
    profile = data
  }

  const role = profile?.role || 'borrower'
  const name = profile?.full_name || user.email?.split('@')[0] || 'User'
  const initial = name.charAt(0).toUpperCase()

  const handleSignOut = async () => {
    'use server'
    const authSupabase = await createClient()
    await authSupabase.auth.signOut()
    redirect('/login')
  }

  return (
    <NavClient 
      role={role} 
      name={name} 
      initial={initial} 
      onSignOut={handleSignOut} 
    />
  )
}
