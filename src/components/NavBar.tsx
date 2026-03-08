import { getSession, getAdminDb } from '@/lib/auth/couchdb'
import { redirect } from 'next/navigation'
import NavClient from './NavClient'
import { cookies } from 'next/headers'

export default async function NavBar() {
  const session = await getSession()
  const user = session?.userCtx?.name

  if (!user) {
    return null // Don't show navbar if not logged in
  }

  let profile: { role: string; full_name: string } = { role: 'borrower', full_name: user }
  try {
    const db = await getAdminDb()
    const data = await db.find({ selector: { type: 'profile', user_id: user } })
    
    if (data.docs && data.docs.length > 0) {
      profile = data.docs[0] as { role: string; full_name: string }
    } else if (session?.userCtx?.roles && session.userCtx.roles.length > 0) {
      profile.role = session.userCtx.roles[0]
    }
  } catch (e) {
    // Non-critical: fall through
    console.error('NavBar profile fetch error:', e)
  }

  const role: string = profile?.role || 'borrower'
  const name: string = profile?.full_name || user || 'User'
  const initial: string = name.charAt(0).toUpperCase()

  const handleSignOut = async () => {
    'use server'
    const cookieStore = await cookies()
    cookieStore.delete('AuthSession')
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
