import Link from 'next/link'
import { BookOpen, Users, ScanLine, Search, LayoutDashboard, LogOut, History, Bookmark } from 'lucide-react'
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
  const name = profile?.full_name || user.email?.split('@')[0] || 'User'
  const initial = name.charAt(0).toUpperCase()

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/80 border-b border-slate-200/50 shadow-sm transition-[background-color,border-color,box-shadow] duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center p-0.5 shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-indigo-500" aria-hidden="true" />
              </div>
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600">
              LMS
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            <NavLink href="/" icon={<LayoutDashboard className="w-4 h-4" aria-hidden="true" />} label="Dashboard" />
            
            {(role === 'borrower' || role === 'super_admin' || role === 'librarian') && (
              <>
                <NavLink href="/catalog" icon={<Search className="w-4 h-4" aria-hidden="true" />} label="Catalog" />
              </>
            )}

            {role === 'borrower' && (
              <>
                <NavLink href="/self-checkout" icon={<ScanLine className="w-4 h-4" aria-hidden="true" />} label="Self Checkout" />
                <NavLink href="/borrowings" icon={<History className="w-4 h-4" aria-hidden="true" />} label="Borrowings" />
                <NavLink href="/reading-lists" icon={<Bookmark className="w-4 h-4" aria-hidden="true" />} label="Lists" />
              </>
            )}

            {(role === 'super_admin' || role === 'librarian' || role === 'circulation_assistant') && (
              <>
                <NavLink href="/admin/books" icon={<BookOpen className="w-4 h-4" aria-hidden="true" />} label="Inventory" />
                <NavLink href="/admin/checkout" icon={<ScanLine className="w-4 h-4" aria-hidden="true" />} label="Checkout Portal" />
                <NavLink href="/admin/approvals" icon={<Bookmark className="w-4 h-4" aria-hidden="true" />} label="Approvals" />
                <NavLink href="/admin/users" icon={<Users className="w-4 h-4" aria-hidden="true" />} label="Users" />
              </>
            )}
          </div>

          {/* User & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 pr-3 border-r border-slate-100">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-slate-800 leading-none">{name}</span>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-1.5">{role.replace(/_/g, ' ')}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg shadow-sm">
                {initial}
              </div>
            </div>
            
            <form action={handleSignOut} className="flex">
              <button
                type="submit"
                className="p-2 sm:p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors group outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation (Bottom Bar) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-safe">
        <div className="flex justify-around items-center px-2 py-2">
          <MobileNavLink href="/" icon={<LayoutDashboard className="w-5 h-5" aria-hidden="true" />} label="Home" />
          {(role === 'borrower' || role === 'super_admin' || role === 'librarian') && <MobileNavLink href="/catalog" icon={<Search className="w-5 h-5" aria-hidden="true" />} label="Catalog" />}
          {role === 'borrower' && (
            <>
              <MobileNavLink href="/self-checkout" icon={<ScanLine className="w-5 h-5" aria-hidden="true" />} label="Checkout" />
              <MobileNavLink href="/borrowings" icon={<History className="w-5 h-5" aria-hidden="true" />} label="Borrowings" />
            </>
          )}
          {(role === 'super_admin' || role === 'librarian' || role === 'circulation_assistant') && (
            <>
              <MobileNavLink href="/admin/checkout" icon={<ScanLine className="w-5 h-5" aria-hidden="true" />} label="Checkout" />
              <MobileNavLink href="/admin/approvals" icon={<Bookmark className="w-5 h-5" aria-hidden="true" />} label="Approvals" />
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link 
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:bg-indigo-50"
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
      className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      {icon}
      <span className="text-[10px] font-bold tracking-tight">{label}</span>
    </Link>
  )
}
