import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import {
  BookOpen, Users, ScanLine, Search, BookMarked, Bookmark,
  AlertTriangle, TrendingUp, Clock, ArrowRight,
  Package, BarChart2, ShieldCheck, CalendarDays, RotateCcw
} from 'lucide-react'
import Image from 'next/image'
import LibraryCard from '@/components/LibraryCardWrapper'
import ReturnButton from './ReturnButton'



// Stat card component
function StatCard({
  label, value, sub, icon: Icon, color
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${colors[color]}`}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// (Removed RoleBadge as it's redundant to the NavBar)

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data
  }

  const role = profile?.role || 'borrower'
  const isStaff = ['super_admin', 'librarian', 'circulation_assistant'].includes(role)
  const isAdmin = ['super_admin', 'librarian'].includes(role)

  // ── Fetch stats based on role ──────────────────────────────────────────
  let totalBooks = 0, totalCopies = 0, availableCopies = 0
  let activeBorrowings = 0, overdueCount = 0, totalBorrowers = 0, pendingCount = 0
  let recentActivity: { id: string; title: string; borrower: string; status: string; date: string }[] = []
  let myBorrowings: { id: string; book_id: string; title: string; cover: string | null; due_date: string; status: string }[] = []
  let dueSoonCount = 0

  if (user && isStaff) {
    const [booksRes, borrowingsRes, profilesRes] = await Promise.all([
      supabase.from('books').select('total_copies, available_copies'),
      supabase.from('borrowing_records').select('id, status, due_date'),
      supabase.from('profiles').select('id, role').eq('role', 'borrower'),
    ])

    totalBooks = booksRes.data?.length || 0
    totalCopies = booksRes.data?.reduce((s, b) => s + (b.total_copies || 0), 0) || 0
    availableCopies = booksRes.data?.reduce((s, b) => s + (b.available_copies || 0), 0) || 0
    activeBorrowings = borrowingsRes.data?.filter(r => r.status === 'borrowed').length || 0
    pendingCount = borrowingsRes.data?.filter(r => r.status === 'pending').length || 0
    overdueCount = borrowingsRes.data?.filter(r => {
      if (r.status !== 'borrowed') return false
      return new Date(r.due_date) < new Date()
    }).length || 0
    totalBorrowers = profilesRes.data?.length || 0

    // Recent borrowings with book titles
    const { data: recent } = await supabase
      .from('borrowing_records')
      .select('id, status, borrowed_date, books(title), profiles(full_name, email)')
      .order('borrowed_date', { ascending: false })
      .limit(6)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentActivity = (recent || []).map((r: any) => ({
      id: r.id,
      title: r.books?.title || 'Unknown Book',
      borrower: r.profiles?.full_name || r.profiles?.email || 'Unknown',
      status: r.status,
      date: r.borrowed_date,
    }))
  }

  if (user && role === 'borrower') {
    const { data: borrows } = await supabase
      .from('borrowing_records')
      .select('id, book_id, due_date, status, books(title, cover_image_url)')
      .eq('borrower_id', user.id)
      .in('status', ['borrowed', 'pending', 'pending_return', 'overdue'])
      .order('due_date', { ascending: true })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    myBorrowings = (borrows || []).map((b: any) => ({
      id: b.id,
      book_id: b.book_id,
      title: b.books?.title || 'Unknown Book',
      cover: b.books?.cover_image_url || null,
      due_date: b.due_date,
      status: b.status,
    }))

    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    dueSoonCount = myBorrowings.filter(b => new Date(b.due_date) <= threeDaysFromNow).length
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] rounded-full bg-indigo-200/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] rounded-full bg-blue-200/30 blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">

        {!user ? (
          // ── LOGGED OUT: Landing ──────────────────────────────────────────
          <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
              <BookOpen className="w-10 h-10 text-white" aria-hidden="true" />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600">
                Library Management System
              </h1>
              <p className="text-lg text-slate-500 max-w-md mx-auto">
                Your next-generation digital library portal — search, borrow, and manage with ease.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full text-left">
              {[
                { icon: Search, color: 'bg-indigo-50 text-indigo-600', title: 'Smart Catalog', desc: 'Search thousands of books, resources, and media instantly.' },
                { icon: ScanLine, color: 'bg-emerald-50 text-emerald-600', title: 'QR Checkout', desc: 'Borrow and return books with your digital library card.' },
                { icon: TrendingUp, color: 'bg-rose-50 text-rose-600', title: 'Real-time Tracking', desc: 'Track due dates and borrowing history anytime.' },
              ].map(({ icon: Icon, color, title, desc }) => (
                <div key={title} className="bg-white/70 backdrop-blur-sm border border-slate-100 rounded-2xl p-5 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1">{title}</h3>
                  <p className="text-sm text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <Link href="/login" className="flex-1 flex items-center justify-center py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-500/30 active:scale-95">
                Login to Portal
              </Link>
              <Link href="/register" className="flex-1 flex items-center justify-center py-3.5 px-6 rounded-xl bg-white border-2 border-slate-200 hover:border-indigo-200 text-slate-700 font-bold transition-all active:scale-95">
                Get Library Card
              </Link>
            </div>
          </div>
        ) : (
          // ── LOGGED IN ────────────────────────────────────────────────────
          <div className="space-y-8">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500 font-medium">{greeting()},</p>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                  {profile?.full_name || user.email?.split('@')[0]}
                </h1>
                <p className="text-sm text-slate-400 mt-1">{user.email}</p>
              </div>
            </div>

            {/* ── STAFF: Alert banner for overdue ── */}
            {isStaff && overdueCount > 0 && (
              <div className="flex items-center gap-3 px-5 py-3.5 bg-rose-50 border border-rose-200 rounded-2xl">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" aria-hidden="true" />
                <p className="text-sm font-semibold text-rose-700">
                  {overdueCount} book{overdueCount > 1 ? 's are' : ' is'} currently overdue. 
                  <Link href="/admin/checkout" className="ml-2 underline font-bold">Review now →</Link>
                </p>
              </div>
            )}

            {/* ── BORROWER: Due soon alert ── */}
            {role === 'borrower' && dueSoonCount > 0 && (
              <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
                <Clock className="w-5 h-5 text-amber-500 shrink-0" aria-hidden="true" />
                <p className="text-sm font-semibold text-amber-700">
                  {dueSoonCount} book{dueSoonCount > 1 ? 's are' : ' is'} due within 3 days. Please return them soon!
                </p>
              </div>
            )}

            {/* ── STAFF: Stats Grid ── */}
            {isStaff && (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard label="Total Titles" value={totalBooks} sub={`${totalCopies} copies`} icon={BookOpen} color="indigo" />
                <StatCard label="Available" value={availableCopies} sub="copies on shelf" icon={Package} color="emerald" />
                <StatCard label="Checked Out" value={totalCopies - availableCopies} sub="currently borrowed" icon={BookMarked} color="blue" />
                <StatCard label="Overdue" value={overdueCount} sub="need follow-up" icon={AlertTriangle} color="rose" />
                <StatCard label="Pending" value={pendingCount} sub="requires approval" icon={Clock} color="amber" />
                <StatCard label="Active Loans" value={activeBorrowings} sub="total records" icon={BarChart2} color="violet" />
                <StatCard label="Borrowers" value={totalBorrowers} sub="registered users" icon={Users} color="indigo" />
              </div>
            )}

            {/* ── Quick Actions ── */}
            <div>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">

                {/* Borrower actions */}
                {role === 'borrower' && (
                  <>
                    <Link href="/catalog" className="group bg-white border border-slate-100 hover:border-indigo-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-2">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Search className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <p className="font-bold text-slate-800">Search Catalog</p>
                      <p className="text-xs text-slate-500">Find books & resources</p>
                    </Link>
                    <Link href="/catalog" className="group bg-white border border-slate-100 hover:border-emerald-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <BookOpen className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <p className="font-bold text-slate-800">Browse Books</p>
                      <p className="text-xs text-slate-500">Discover new reads</p>
                    </Link>
                    <Link href="/self-checkout" className="group bg-white border border-slate-100 hover:border-violet-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-2">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
                        <ScanLine className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <p className="font-bold text-slate-800">Self-Checkout</p>
                      <p className="text-xs text-slate-500">Borrow books instantly</p>
                    </Link>
                  </>
                )}

                {/* Circulation + Admin actions */}
                {isStaff && (
                  <>
                    <Link href="/admin/checkout" className="group bg-white border border-slate-100 hover:border-emerald-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <ScanLine className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <p className="font-bold text-slate-800">Checkout / Return</p>
                      <p className="text-xs text-slate-500">Scan books & library cards</p>
                    </Link>
                    <Link href="/admin/approvals" className="group bg-white border border-slate-100 hover:border-amber-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-2 relative">
                      {pendingCount > 0 && (
                        <span className="absolute top-4 right-4 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </span>
                      )}
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                        <Bookmark className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <p className="font-bold text-slate-800">Approvals</p>
                      <p className="text-xs text-slate-500">Manage borrow requests</p>
                    </Link>
                    <Link href="/catalog" className="group bg-white border border-slate-100 hover:border-indigo-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-2">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Search className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <p className="font-bold text-slate-800">Catalog</p>
                      <p className="text-xs text-slate-500">Browse all books</p>
                    </Link>
                  </>
                )}

                {/* Admin-only actions */}
                {isAdmin && (
                  <>
                    <Link href="/admin/books" className="group bg-white border border-slate-100 hover:border-violet-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-2">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
                        <BookMarked className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <p className="font-bold text-slate-800">Inventory</p>
                      <p className="text-xs text-slate-500">Manage book catalog</p>
                    </Link>
                    <Link href="/admin/users" className="group bg-white border border-slate-100 hover:border-blue-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Users className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <p className="font-bold text-slate-800">Users</p>
                      <p className="text-xs text-slate-500">Manage library accounts</p>
                    </Link>
                  </>
                )}

                {role === 'super_admin' && (
                  <div className="group bg-white border border-slate-100 hover:border-rose-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-2 cursor-default opacity-60">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <p className="font-bold text-slate-800">System Settings</p>
                    <p className="text-xs text-slate-400">Coming soon</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── STAFF: Recent Activity ── */}
            {isStaff && recentActivity.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Recent Borrowings</h2>
                  <Link href="/admin/checkout" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    View All <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </Link>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Book</th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Borrower</th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {recentActivity.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3.5 font-medium text-slate-900 max-w-[180px] truncate">{r.title}</td>
                            <td className="px-5 py-3.5 text-slate-600 max-w-[140px] truncate">{r.borrower}</td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                                r.status === 'borrowed' ? 'bg-blue-100 text-blue-700' :
                                r.status === 'returned' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-rose-100 text-rose-700'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-400 text-xs hidden sm:table-cell">
                              {new Date(r.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── BORROWER: Library Card + Active Borrowings ── */}
            {role === 'borrower' && (
              <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">

                {/* Library Card Column */}
                <div>
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">My Library Card</h2>
                  <LibraryCard
                    userId={user!.id}
                    fullName={profile?.full_name || user?.email || 'Student'}
                    studentNumber={profile?.student_number}
                    role={role}
                  />
                </div>

                {/* Active Borrowings column */}
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                    My Active Borrowings
                    {myBorrowings.length > 0 && (
                      <span className="ml-2 text-indigo-600">({myBorrowings.length})</span>
                    )}
                  </h2>
                  <Link href="/catalog" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    Browse Catalog <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </Link>
                </div>
                {myBorrowings.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
                    <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" aria-hidden="true" />
                    <p className="text-slate-500 font-medium">No active borrowings</p>
                    <p className="text-sm text-slate-400 mt-1">Head to the catalog to find your next book!</p>
                    <Link href="/catalog" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
                      <Search className="w-4 h-4" aria-hidden="true" /> Browse Books
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myBorrowings.map((b) => {
                      const due = new Date(b.due_date)
                      const now = new Date()
                      const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                      const isOverdue = daysLeft < 0
                      const isDueSoon = !isOverdue && daysLeft <= 3
                      return (
                        <div key={b.id} className={`bg-white border rounded-2xl shadow-sm overflow-hidden flex gap-4 p-4 ${
                          isOverdue ? 'border-rose-200' : isDueSoon ? 'border-amber-200' : 'border-slate-100'
                        }`}>
                          <div className="relative w-14 h-20 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                            {b.cover ? (
                              <Image src={b.cover} alt={b.title} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-slate-300" aria-hidden="true" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-sm leading-tight truncate">{b.title}</p>
                            
                            {b.status === 'pending' ? (
                              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold shadow-sm">
                                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                                Pending Approval
                              </div>
                            ) : b.status === 'pending_return' ? (
                              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-sm">
                                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                                Return Requested
                              </div>
                            ) : (
                              <>
                                <div className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${
                                  isOverdue ? 'text-rose-600' : isDueSoon ? 'text-amber-600' : 'text-slate-500'
                                }`}>
                                  <CalendarDays className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                  {isOverdue
                                    ? `Overdue by ${Math.abs(daysLeft)}d`
                                    : daysLeft === 0
                                    ? 'Due today!'
                                    : `Due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5 mb-2">
                                  {due.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                                <ReturnButton recordId={b.id} />
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                </div>
              </div>
            )}


            {/* ── STAFF: Empty state if no borrowings ── */}
            {isStaff && recentActivity.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
                <BarChart2 className="w-10 h-10 text-slate-300 mx-auto mb-3" aria-hidden="true" />
                <p className="text-slate-500 font-medium">No borrowing records yet</p>
                <p className="text-sm text-slate-400 mt-1">Activity will appear here once books are checked out.</p>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  )
}
