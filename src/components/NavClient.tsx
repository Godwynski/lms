'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BookOpen, Users, ScanLine, Search, LayoutDashboard, 
  LogOut, History, Bookmark, BookMarked, Menu, X, ChevronDown, BookOpenText, Database
} from 'lucide-react'

interface NavClientProps {
  role: string
  name: string
  initial: string
  onSignOut: () => void
}

// 1. Reusable Desktop Link
const DesktopLink = ({ href, icon, label, pathname, exact = false }: { href: string; icon: React.ReactNode; label: string; pathname: string; exact?: boolean }) => {
  const isActive = exact ? pathname === href : pathname.startsWith(href)
  return (
    <Link 
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
        isActive 
          ? 'bg-indigo-600 text-white shadow-sm' 
          : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon}
      {label}
    </Link>
  )
}

// 2. Reusable Mobile Link
const MobileLink = ({ href, icon, label, pathname, exact = false }: { href: string; icon: React.ReactNode; label: string; pathname: string; exact?: boolean }) => {
  const isActive = exact ? pathname === href : pathname.startsWith(href)
  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        isActive 
          ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 pl-3' 
          : 'text-slate-600 hover:bg-slate-50'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon}
      {label}
    </Link>
  )
}

// 3. Dropdown Item for Desktop
const DropdownItem = ({ href, icon, label, pathname, exact = false }: { href: string; icon: React.ReactNode; label: string; pathname: string; exact?: boolean }) => {
  const isActive = exact ? pathname === href : pathname.startsWith(href)
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        isActive 
          ? 'bg-indigo-50 text-indigo-700 font-semibold border-l-2 border-indigo-600 pl-[14px]' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
      }`}
      role="menuitem"
      aria-current={isActive ? 'page' : undefined}
    >
      {icon}
      {label}
    </Link>
  )
}

export default function NavClient({ role, name, initial, onSignOut }: NavClientProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isStaffMenuOpen, setIsStaffMenuOpen] = useState(false)
  const staffMenuRef = useRef<HTMLDivElement>(null)

  // Determine which links to show based on role
  const isBorrower = role === 'borrower' || role === 'super_admin' || role === 'librarian'
  const isStaff = role === 'super_admin' || role === 'librarian' || role === 'circulation_assistant'

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (staffMenuRef.current && !staffMenuRef.current.contains(event.target as Node)) {
        setIsStaffMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Close mobile menu when pathname changes (user navigated)
  useEffect(() => {
    // Instead of directly setting state here which causes synchronous cascades,
    // we manage it through a simple state toggle if needed, or preferably we
    // handle it on route change natively. In this case, wrapping it in a 
    // minimal timeout or just doing it directly is fine, but we can avoid the warning 
    // by moving the closure logic to the click handlers if possible, or using an effect cleaner.
    // For now, we'll keep it simple as it is just clearing UI state:
    const closeMenus = () => {
      setIsMobileMenuOpen(false)
      setIsStaffMenuOpen(false)
    }
    closeMenus()
  }, [pathname])

  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev)
  const toggleStaffMenu = () => setIsStaffMenuOpen((prev) => !prev)

  const isStaffActive = pathname.startsWith('/admin')

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white border-b border-slate-200/80 shadow-sm" aria-label="Main Navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2 group outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl px-1 py-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center p-0.5 shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-indigo-500" aria-hidden="true" />
              </div>
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600 hidden sm:block">
              LMS
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2 flex-1 justify-center">
            <DesktopLink href="/" icon={<LayoutDashboard className="w-4 h-4" aria-hidden="true" />} label="Dashboard" pathname={pathname} exact />
            
            {isBorrower && (
              <DesktopLink href="/catalog" icon={<Search className="w-4 h-4" aria-hidden="true" />} label="Catalog" pathname={pathname} />
            )}

            {(isBorrower || isStaff) && (
              <DesktopLink href="/theses" icon={<BookOpenText className="w-4 h-4" aria-hidden="true" />} label="Theses" pathname={pathname} />
            )}

            {role === 'borrower' && (
              <>
                <DesktopLink href="/borrowings" icon={<History className="w-4 h-4" aria-hidden="true" />} label="Borrowings" pathname={pathname} />
                <DesktopLink href="/reading-lists" icon={<Bookmark className="w-4 h-4" aria-hidden="true" />} label="Lists" pathname={pathname} />
              </>
            )}

            {isStaff && (
              <div className="relative" ref={staffMenuRef}>
                <button
                  onClick={toggleStaffMenu}
                  aria-expanded={isStaffMenuOpen}
                  aria-haspopup="true"
                  aria-controls="staff-menu"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                    isStaffMenuOpen || isStaffActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'
                  }`}
                >
                  <BookMarked className="w-4 h-4" aria-hidden="true" />
                  Staff
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isStaffMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                
                {/* Desktop Dropdown Menu */}
                {isStaffMenuOpen && (
                  <div 
                    id="staff-menu"
                    role="menu"
                    className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 animate-in fade-in slide-in-from-top-2 origin-top-left"
                  >
                    <DropdownItem href="/admin/books" icon={<BookOpen className="w-4 h-4" aria-hidden="true" />} label="Inventory" pathname={pathname} />
                    <DropdownItem href="/admin/checkout" icon={<ScanLine className="w-4 h-4" aria-hidden="true" />} label="Checkout Portal" pathname={pathname} />
                    <DropdownItem href="/admin/borrowings" icon={<History className="w-4 h-4" aria-hidden="true" />} label="All Borrowings" pathname={pathname} />
                    <DropdownItem href="/admin/approvals" icon={<Bookmark className="w-4 h-4" aria-hidden="true" />} label="Approvals" pathname={pathname} />
                    <DropdownItem href="/admin/theses" icon={<BookOpenText className="w-4 h-4" aria-hidden="true" />} label="Manage Theses" pathname={pathname} />
                    <DropdownItem href="/admin/data-hub" icon={<Database className="w-4 h-4" aria-hidden="true" />} label="Data Hub" pathname={pathname} />
                    <DropdownItem href="/admin/audit" icon={<ScanLine className="w-4 h-4" aria-hidden="true" />} label="Audit Mode" pathname={pathname} />
                    <DropdownItem href="/admin/users" icon={<Users className="w-4 h-4" aria-hidden="true" />} label="Users" pathname={pathname} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile & Actions (Desktop & Tablet) */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 pr-3 border-r border-slate-200">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-slate-800 leading-none">{name}</span>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-1">{role.replace(/_/g, ' ')}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm shadow-sm" aria-hidden="true">
                {initial}
              </div>
            </div>
            
            <button
              onClick={onSignOut}
              className="hidden sm:flex p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors group outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              className="md:hidden p-2 -mr-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div 
          id="mobile-menu" 
          className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-xl overflow-y-auto max-h-[calc(100vh-4rem)] animate-in slide-in-from-top-1 fade-in duration-200 pb-safe"
        >
          <div className="px-4 py-6 space-y-6">
            
            {/* Mobile Profile Section */}
            <div className="sm:hidden flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shadow-sm" aria-hidden="true">
                {initial}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-800 text-lg leading-tight">{name}</span>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{role.replace(/_/g, ' ')}</span>
              </div>
            </div>

            {/* Mobile Main Links */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-2">Main Menu</p>
              <MobileLink href="/" icon={<LayoutDashboard className="w-5 h-5" aria-hidden="true" />} label="Dashboard" pathname={pathname} exact />
              {isBorrower && <MobileLink href="/catalog" icon={<Search className="w-5 h-5" aria-hidden="true" />} label="Catalog" pathname={pathname} />}
              {(isBorrower || isStaff) && <MobileLink href="/theses" icon={<BookOpenText className="w-5 h-5" aria-hidden="true" />} label="Thesis Explorer" pathname={pathname} />}
              {role === 'borrower' && (
                <>
                  <MobileLink href="/borrowings" icon={<History className="w-5 h-5" aria-hidden="true" />} label="My Borrowings" pathname={pathname} />
                  <MobileLink href="/reading-lists" icon={<Bookmark className="w-5 h-5" aria-hidden="true" />} label="Reading Lists" pathname={pathname} />
                </>
              )}
            </div>

            {/* Mobile Staff Links */}
            {isStaff && (
              <div className="space-y-1 pt-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-2">Staff Functions</p>
                <MobileLink href="/admin/books" icon={<BookOpen className="w-5 h-5" aria-hidden="true" />} label="Inventory" pathname={pathname} />
                <MobileLink href="/admin/checkout" icon={<ScanLine className="w-5 h-5" aria-hidden="true" />} label="Checkout Portal" pathname={pathname} />
                <MobileLink href="/admin/borrowings" icon={<History className="w-5 h-5" aria-hidden="true" />} label="All Borrowings" pathname={pathname} />
                <MobileLink href="/admin/approvals" icon={<Bookmark className="w-5 h-5" aria-hidden="true" />} label="Approvals" pathname={pathname} />
                <MobileLink href="/admin/theses" icon={<BookOpenText className="w-5 h-5" aria-hidden="true" />} label="Manage Theses" pathname={pathname} />
                <MobileLink href="/admin/data-hub" icon={<Database className="w-5 h-5" aria-hidden="true" />} label="Data Hub" pathname={pathname} />
                <MobileLink href="/admin/audit" icon={<ScanLine className="w-5 h-5" aria-hidden="true" />} label="Audit Mode" pathname={pathname} />
                <MobileLink href="/admin/users" icon={<Users className="w-5 h-5" aria-hidden="true" />} label="Users" pathname={pathname} />
              </div>
            )}

            {/* Mobile Sign Out */}
            <div className="pt-4 border-t border-slate-100 sm:hidden">
              <button
                onClick={onSignOut}
                className="flex items-center w-full gap-3 px-4 py-3 rounded-xl font-semibold text-rose-600 hover:bg-rose-50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" />
                Sign Out
              </button>
            </div>
            
          </div>
        </div>
      )}
    </nav>
  )
}
