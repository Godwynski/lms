import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { BookOpen, Users, ShieldAlert, ScanLine, Search, Settings } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data
  }

  const role = profile?.role || 'borrower' // default to borrower

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-200/40 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-200/40 blur-[120px]" />
      </div>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 sm:p-12 md:p-24">
        <div className="w-full max-w-2xl p-8 backdrop-blur-xl bg-white/70 border border-slate-200 rounded-[2rem] shadow-xl transition-all duration-500 hover:shadow-indigo-500/10 hover:border-indigo-100">
          <div className="flex flex-col items-center text-center space-y-6">
            
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center p-0.5 shadow-lg shadow-indigo-500/30">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-indigo-500" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600">
                Library Management System
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Next-generation portal
              </p>
            </div>

            <div className="w-full pt-4 space-y-4">
              {user ? (
                <div className="space-y-6">
                  <div className="w-full p-6 text-left rounded-2xl bg-slate-100/50 border border-slate-200/60 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Logged in as</p>
                      <h3 className="text-lg font-bold text-slate-800">{profile?.full_name || user.email}</h3>
                      <p className="text-xs text-slate-400 mt-1">{user.email}</p>
                    </div>
                    <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-indigo-200">
                      {role}
                    </div>
                  </div>

                  {/* Role based dashboard sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    {(role === 'super_admin' || role === 'librarian') && (
                      <>
                        <Link href="/admin/system" className="block p-4 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 transition-colors cursor-pointer group shadow-sm hover:shadow-rose-500/10">
                          <ShieldAlert className="w-6 h-6 text-rose-500 mb-2 group-hover:scale-110 transition-transform" />
                          <h4 className="font-semibold text-rose-900">System Management</h4>
                          <p className="text-xs text-rose-600/80">Manage users, roles, and global settings</p>
                        </Link>
                        <Link href="/admin/settings" className="block p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 transition-colors cursor-pointer group shadow-sm hover:shadow-indigo-500/10">
                          <Settings className="w-6 h-6 text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
                          <h4 className="font-semibold text-indigo-900">Library Configuration</h4>
                          <p className="text-xs text-indigo-600/80">Branches, operating hours, policies</p>
                        </Link>
                      </>
                    )}

                    {(role === 'super_admin' || role === 'librarian' || role === 'circulation_assistant') && (
                      <>
                        <Link href="/admin/checkout" className="block p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 transition-colors cursor-pointer group shadow-sm hover:shadow-emerald-500/10">
                          <ScanLine className="w-6 h-6 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                          <h4 className="font-semibold text-emerald-900">Checkout / Return</h4>
                          <p className="text-xs text-emerald-600/80">Scan books or user ID cards</p>
                        </Link>
                        <Link href="/admin/users" className="block p-4 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition-colors cursor-pointer group shadow-sm hover:shadow-blue-500/10">
                          <Users className="w-6 h-6 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                          <h4 className="font-semibold text-blue-900">User Management</h4>
                          <p className="text-xs text-blue-600/80">Manage borrowers and fines</p>
                        </Link>
                      </>
                    )}

                    {(role === 'borrower') && (
                      <>
                        <Link href="/catalog" className="block p-4 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-50 transition-colors cursor-pointer group shadow-sm hover:shadow-amber-500/10">
                          <Search className="w-6 h-6 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                          <h4 className="font-semibold text-amber-900">Search Catalog</h4>
                          <p className="text-xs text-amber-600/80">Find books, media, and resources</p>
                        </Link>
                        <Link href="/borrowings" className="block p-4 rounded-xl border border-teal-100 bg-teal-50/50 hover:bg-teal-50 transition-colors cursor-pointer group shadow-sm hover:shadow-teal-500/10">
                          <BookOpen className="w-6 h-6 text-teal-500 mb-2 group-hover:scale-110 transition-transform" />
                          <h4 className="font-semibold text-teal-900">My Borrowings</h4>
                          <p className="text-xs text-teal-600/80">View checked out items and due dates</p>
                        </Link>
                      </>
                    )}
                  </div>

                  <form action="/auth/signout" method="post" className="pt-2">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center py-3.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
                    >
                      Sign Out
                    </button>
                  </form>
                </div>
              ) : (
                <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl border border-indigo-100/50 bg-gradient-to-br from-indigo-50/50 to-white hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 group">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <Search className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-800 mb-1">Smart Catalog</h3>
                      <p className="text-sm text-slate-500">Search thousands of books, resources, and media instantly from your phone.</p>
                    </div>

                    <div className="p-5 rounded-2xl border border-emerald-100/50 bg-gradient-to-br from-emerald-50/50 to-white hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 group">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <ScanLine className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-800 mb-1">QR Checkout</h3>
                      <p className="text-sm text-slate-500">Use your digital library card to borrow and return books in seconds.</p>
                    </div>

                    <div className="p-5 rounded-2xl border border-rose-100/50 bg-gradient-to-br from-rose-50/50 to-white hover:shadow-lg hover:shadow-rose-500/10 transition-all duration-300 group md:col-span-2">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-800 mb-1">Real-time Tracking</h3>
                      <p className="text-sm text-slate-500">Track your current borrowings, due dates, and monitor your account standing directly from the dashboard.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                    <Link 
                      href="/login" 
                      className="flex-1 flex items-center justify-center py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition-all duration-200 shadow-xl shadow-slate-900/20 active:scale-[0.98]"
                    >
                      Login to Portal
                    </Link>
                    <Link 
                      href="/register" 
                      className="flex-1 flex items-center justify-center py-4 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold border-2 border-slate-100 transition-all duration-200 hover:border-slate-200 active:scale-[0.98]"
                    >
                      Get Library Card
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

