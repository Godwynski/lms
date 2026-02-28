import Link from 'next/link'
import { BookOpen, Users, ScanLine, Search, LayoutDashboard, LogOut } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function NavBar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null // Don't show navbar if not logged in
  }

  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data
  }

  const role = profile?.role || 'borrower'

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/80 border-b border-slate-200/50 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center p-0.5 shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-indigo-500" />
              </div>
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600">
              LMS
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            <NavLink href="/" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
            
            {(role === 'borrower' || role === 'super_admin' || role === 'librarian') && (
              <>
                <NavLink href="/catalog" icon={<Search className="w-4 h-4" />} label="Catalog" />
              </>
            )}

            {(role === 'super_admin' || role === 'librarian' || role === 'circulation_assistant') && (
              <>
                <NavLink href="/admin/checkout" icon={<ScanLine className="w-4 h-4" />} label="Checkout Portal" />
                <NavLink href="/admin/users" icon={<Users className="w-4 h-4" />} label="Users" />
              </>
            )}
          </div>

          {/* User & Actions */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-800 leading-none">{profile?.full_name || user.email}</span>
              <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mt-1">{role}</span>
            </div>
            
            <form action={handleSignOut}>
              <button
                type="submit"
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors group"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            </form>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation (Bottom Bar or Condensed) */}
      <div className="md:hidden border-t border-slate-100 bg-white/50 px-2 py-2 flex justify-around overflow-x-auto">
        <MobileNavLink href="/" icon={<LayoutDashboard className="w-5 h-5" />} label="Home" />
        {(role === 'borrower' || role === 'super_admin' || role === 'librarian') && <MobileNavLink href="/catalog" icon={<Search className="w-5 h-5" />} label="Catalog" />}
        {(role === 'super_admin' || role === 'librarian' || role === 'circulation_assistant') && (
          <>
            <MobileNavLink href="/admin/checkout" icon={<ScanLine className="w-5 h-5" />} label="Checkout" />
            <MobileNavLink href="/admin/users" icon={<Users className="w-5 h-5" />} label="Users" />
          </>
        )}
      </div>
    </nav>
  )
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link 
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
    >
      {icon}
      {label}
    </Link>
  )
}

function MobileNavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link 
      href={href}
      className="flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors active:scale-95"
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </Link>
  )
}
