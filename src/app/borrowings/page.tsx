import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, CalendarDays, ArrowLeft, History, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import Image from 'next/image'

export const metadata = {
  title: 'My Borrowings - Library Management System',
}

export default async function BorrowingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all borrowings for the current user
  const { data: rawBorrowings } = await supabase
    .from('borrowing_records')
    .select('id, book_id, due_date, status, borrowed_date, returned_date, books(title, cover_image_url)')
    .eq('borrower_id', user.id)
    .order('borrowed_date', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const borrowings = (rawBorrowings || []).map((b: any) => ({
    id: b.id,
    book_id: b.book_id,
    title: b.books?.title || 'Unknown Book',
    cover: b.books?.cover_image_url || null,
    borrowed_date: b.borrowed_date,
    due_date: b.due_date,
    returned_date: b.returned_date,
    status: b.status,
  }))

  const activeBorrowings = borrowings.filter(b => b.status === 'borrowed')
  const pastBorrowings = borrowings.filter(b => b.status === 'returned')

  const now = new Date()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div>
          <Link href="/" className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" aria-hidden="true" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <History className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Borrowings</h1>
              <p className="text-slate-500 font-medium mt-1">
                View your active loans and complete borrowing history.
              </p>
            </div>
          </div>
        </div>

        {/* Active Borrowings */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" aria-hidden="true" />
            Active Loans
            <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2.5 rounded-full text-xs font-bold tabular-nums">
              {activeBorrowings.length}
            </span>
          </h2>

          {activeBorrowings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500 shadow-sm">
              <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-3" aria-hidden="true" />
              <p>You have no active borrowings.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeBorrowings.map(b => {
                const due = new Date(b.due_date)
                const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                const isOverdue = daysLeft < 0
                const isDueSoon = !isOverdue && daysLeft <= 3

                return (
                  <div key={b.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col ${
                    isOverdue ? 'border-rose-200' : isDueSoon ? 'border-amber-200' : 'border-slate-100'
                  }`}>
                    <div className="p-4 flex gap-4">
                      <div className="relative w-16 h-24 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                        {b.cover ? (
                          <Image src={b.cover} alt={b.title} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-slate-300" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <p className="font-bold text-slate-900 text-sm leading-tight line-clamp-2" title={b.title}>
                          {b.title}
                        </p>
                        <div className="mt-auto">
                          <div className={`flex items-center gap-1.5 text-xs font-semibold ${
                            isOverdue ? 'text-rose-600' : isDueSoon ? 'text-amber-600' : 'text-slate-500'
                          }`}>
                            {isOverdue ? (
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            ) : (
                              <CalendarDays className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            )}
                            {isOverdue
                              ? `Overdue by ${Math.abs(daysLeft)}d`
                              : daysLeft === 0
                              ? 'Due today!'
                              : `Due in ${daysLeft}d`}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                            Due: {due.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Borrowing History */}
        <div className="space-y-4 pt-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" aria-hidden="true" />
            Borrowing History
          </h2>

          {pastBorrowings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500 shadow-sm">
              <History className="w-8 h-8 mx-auto text-slate-300 mb-3" aria-hidden="true" />
              <p>Your history is clean. No returned books yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-4 text-left font-bold text-slate-500 uppercase tracking-widest text-xs">Book</th>
                      <th className="px-5 py-4 text-left font-bold text-slate-500 uppercase tracking-widest text-xs hidden sm:table-cell">Borrowed</th>
                      <th className="px-5 py-4 text-left font-bold text-slate-500 uppercase tracking-widest text-xs">Returned</th>
                      <th className="px-5 py-4 text-right font-bold text-slate-500 uppercase tracking-widest text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pastBorrowings.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {b.cover ? (
                              <Image src={b.cover} alt={b.title} width={32} height={48} className="w-8 h-12 object-cover rounded border border-slate-200 shrink-0" />
                            ) : (
                              <div className="w-8 h-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center shrink-0">
                                <BookOpen className="w-4 h-4 text-slate-300" aria-hidden="true" />
                              </div>
                            )}
                            <p className="font-semibold text-slate-900 line-clamp-2 max-w-[200px]" title={b.title}>{b.title}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-500 tabular-nums hidden sm:table-cell">
                          {new Date(b.borrowed_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-4 text-slate-500 tabular-nums">
                          {b.returned_date 
                            ? new Date(b.returned_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '-'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                            Returned
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
