'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import {
  Search, BookOpen, AlertTriangle, CalendarDays, Clock,
  CheckCircle2, AlertCircle, CornerDownLeft, Loader2, BookMarked
} from 'lucide-react'
import { processDirectReturn } from './actions'
import type { BorrowingRecord } from './page'

// Snapshot of current time at module load — avoids calling Date functions during render
const MODULE_LOAD_TIME = Date.now()

function getStatusMeta(status: string, dueDateStr: string, nowMs: number) {
  const due = new Date(dueDateStr)
  const daysLeft = Math.ceil((due.getTime() - nowMs) / (1000 * 60 * 60 * 24))

  if (status === 'pending') {
    return {
      label: 'Pending Approval',
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      icon: <Clock className="w-3 h-3" aria-hidden="true" />,
    }
  }
  if (status === 'pending_return') {
    return {
      label: 'Pending Return',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: <CornerDownLeft className="w-3 h-3" aria-hidden="true" />,
    }
  }
  if (daysLeft < 0 || status === 'overdue') {
    return {
      label: `Overdue ${Math.abs(daysLeft)}d`,
      color: 'bg-rose-100 text-rose-700 border-rose-200',
      icon: <AlertTriangle className="w-3 h-3" aria-hidden="true" />,
    }
  }
  if (daysLeft <= 3) {
    return {
      label: daysLeft === 0 ? 'Due today' : `Due in ${daysLeft}d`,
      color: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: <CalendarDays className="w-3 h-3" aria-hidden="true" />,
    }
  }
  return {
    label: `Due in ${daysLeft}d`,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: <Clock className="w-3 h-3" aria-hidden="true" />,
  }
}

export default function BorrowingsClient({ records: initialRecords }: { records: BorrowingRecord[] }) {
  const [records, setRecords] = useState<BorrowingRecord[]>(initialRecords)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showFeedback = (message: string, type: 'success' | 'error') => {
    setFeedback({ message, type })
    setTimeout(() => setFeedback(null), 4000)
  }

  const handleReturn = (record: BorrowingRecord) => {
    if (!record.books) return
    setProcessingId(record.id)
    startTransition(async () => {
      const res = await processDirectReturn(record.id, record.books!.id)
      setProcessingId(null)
      if (res.success) {
        setRecords(prev => prev.filter(r => r.id !== record.id))
        showFeedback(`"${record.books?.title}" successfully returned.`, 'success')
      } else {
        showFeedback(res.error || 'Failed to process return.', 'error')
      }
    })
  }

  const q = search.toLowerCase()
  const filtered = records.filter(r =>
    r.books?.title.toLowerCase().includes(q) ||
    r.profiles?.full_name?.toLowerCase().includes(q) ||
    r.profiles?.student_number?.toLowerCase().includes(q) ||
    r.books?.isbn.includes(q)
  )

  const nowMs = MODULE_LOAD_TIME
  const overdueCount = records.filter(r => {
    const daysLeft = Math.ceil((new Date(r.due_date).getTime() - nowMs) / (1000 * 60 * 60 * 24))
    return daysLeft < 0 || r.status === 'overdue'
  }).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200/50 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">All Active Loans</h1>
            <p className="text-slate-500 font-medium mt-1">Process in-person returns and monitor due dates.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm border border-slate-200 shadow-sm">
              <BookMarked className="w-4 h-4 text-indigo-500" aria-hidden="true" />
              {records.length} Active
            </div>
            {overdueCount > 0 && (
              <div className="flex items-center gap-2 bg-rose-50 text-rose-700 font-bold px-4 py-2 rounded-xl text-sm border border-rose-200 shadow-sm">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                {overdueCount} Overdue
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by student name, student number, book title, or ISBN…"
            aria-label="Search borrowing records"
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-3 p-4 rounded-2xl border font-semibold text-sm animate-in slide-in-from-top-4 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" aria-hidden="true" />
            : <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" aria-hidden="true" />}
          {feedback.message}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-slate-200/50 p-14 text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">
            {search ? 'No matches found' : 'No Active Loans'}
          </h3>
          <p className="text-slate-500 font-medium mt-1">
            {search ? 'Try a different search term.' : 'All books are accounted for!'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-[35%]">Book</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-[25%]">Borrower</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-[15%]">Due Date</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-[15%]">Status</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-[10%] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(record => {
                  const statusMeta = getStatusMeta(record.status, record.due_date, nowMs)
                  const isProcessingThis = processingId === record.id && isPending
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Book */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-14 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                            {record.books?.cover_image_url ? (
                              <Image
                                src={record.books.cover_image_url}
                                alt={record.books.title}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-slate-300" aria-hidden="true" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                              {record.books?.title || 'Unknown Title'}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {record.books?.author || 'Unknown Author'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ISBN: {record.books?.isbn || '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Borrower */}
                      <td className="py-4 px-6">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {record.profiles?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {record.profiles?.student_number || record.profiles?.email || '—'}
                        </p>
                      </td>

                      {/* Due date */}
                      <td className="py-4 px-6">
                        <p className="text-sm text-slate-700 font-medium tabular-nums">
                          {new Date(record.due_date).toLocaleDateString('en-PH', {
                            month: 'short', day: 'numeric', year: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Borrowed {new Date(record.borrowed_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${statusMeta.color}`}>
                          {statusMeta.icon}
                          {statusMeta.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleReturn(record)}
                          disabled={isPending}
                          aria-label={`Process return for ${record.books?.title}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 transition-all active:scale-95"
                        >
                          {isProcessingThis
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                            : <CornerDownLeft className="w-3.5 h-3.5" aria-hidden="true" />}
                          Return
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(record => {
              const statusMeta = getStatusMeta(record.status, record.due_date, nowMs)
              const isProcessingThis = processingId === record.id && isPending
              return (
                <div key={record.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                  <div className="flex gap-3">
                    <div className="relative w-12 h-18 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200" style={{ height: '4.5rem' }}>
                      {record.books?.cover_image_url ? (
                        <Image
                          src={record.books.cover_image_url}
                          alt={record.books?.title || ''}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-slate-300" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                          {record.books?.title || 'Unknown Title'}
                        </p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border shrink-0 ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{record.books?.author}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                    <p className="text-sm font-bold text-slate-800">{record.profiles?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500 font-mono">{record.profiles?.student_number || record.profiles?.email}</p>
                    <p className="text-xs text-slate-400 tabular-nums">
                      Due: {new Date(record.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  <button
                    onClick={() => handleReturn(record)}
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-bold shadow-sm shadow-emerald-500/20 transition-all active:scale-[0.98]"
                  >
                    {isProcessingThis
                      ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      : <CornerDownLeft className="w-4 h-4" aria-hidden="true" />}
                    Process Return
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
