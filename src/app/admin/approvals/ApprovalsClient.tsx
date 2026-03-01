'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { 
  CheckCircle2, XCircle, Search, Clock, BookOpen, AlertCircle, Loader2 
} from 'lucide-react'
import { approveRequest, rejectRequest, approveReturnRequest, rejectReturnRequest } from './actions'

type RequestData = {
  id: string
  status: string
  borrowed_date: string
  book_id: string
  books: { id: string; title: string; author: string; cover_image_url: string; isbn: string } | null
  borrower_id: string
  profiles: { full_name: string; email: string; student_number: string } | null
}

export default function ApprovalsClient({ initialRequests }: { initialRequests: RequestData[] }) {
  // Normalize data for consistent mapping
  const normalizedRequests: RequestData[] = initialRequests.map(req => ({
    ...req,
    books: Array.isArray(req.books) ? req.books[0] : req.books,
    profiles: Array.isArray(req.profiles) ? req.profiles[0] : req.profiles,
  }))

  const [requests, setRequests] = useState<RequestData[]>(normalizedRequests)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showFeedback = (message: string, type: 'success' | 'error') => {
    setFeedback({ message, type })
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleApprove = (recordId: string, status: string, bookId: string) => {
    startTransition(async () => {
      const res = status === 'pending_return'
        ? await approveReturnRequest(recordId, bookId)
        : await approveRequest(recordId)
        
      if (res.success) {
        setRequests(prev => prev.filter(r => r.id !== recordId))
        showFeedback(status === 'pending_return' ? 'Return approved successfully.' : 'Borrow request approved successfully.', 'success')
      } else {
        showFeedback(res.error || 'Failed to approve', 'error')
      }
    })
  }

  const handleReject = (recordId: string, status: string, bookId: string) => {
    startTransition(async () => {
      const res = status === 'pending_return'
        ? await rejectReturnRequest(recordId)
        : await rejectRequest(recordId, bookId)

      if (res.success) {
        setRequests(prev => prev.filter(r => r.id !== recordId))
        showFeedback(status === 'pending_return' ? 'Return rejected. Still borrowed.' : 'Request rejected. Book copies restored.', 'success')
      } else {
        showFeedback(res.error || 'Failed to reject', 'error')
      }
    })
  }

  const filteredRequests = requests.filter(req => {
    const q = searchQuery.toLowerCase()
    return (
      req.books?.title.toLowerCase().includes(q) ||
      req.profiles?.full_name.toLowerCase().includes(q) ||
      req.profiles?.student_number?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header & Search */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Pending Approvals</h1>
            <p className="text-slate-500 font-medium mt-1">
              Review self-checkout requests from students.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 font-bold px-4 py-2 rounded-xl text-sm border border-indigo-100 shadow-sm">
            <Clock className="w-4 h-4" />
            {requests.length} Pending
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, ID, or book title..."
            className="w-full pl-12 pr-4 py-3 border border-slate-200 shadow-sm text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/50 text-sm font-medium transition-all"
          />
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in slide-in-from-top-4 ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
          <span className="font-semibold text-sm">{feedback.message}</span>
        </div>
      )}

      {/* List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200/50 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">All Caught Up!</h3>
            <p className="text-slate-500 font-medium mt-1">There are no pending borrow requests at the moment.</p>
          </div>
        ) : (
          filteredRequests.map(req => (
            <div key={req.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col sm:flex-row gap-5">
              
              {/* Book Info */}
              <div className="flex gap-4 sm:w-1/2">
                <div className="relative w-16 h-24 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-100 shadow-sm">
                  {req.books?.cover_image_url ? (
                    <Image src={req.books.cover_image_url} alt="Cover" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${req.status === 'pending' ? 'text-indigo-600' : 'text-blue-600'}`}>
                    {req.status === 'pending' ? 'Borrow Request' : 'Return Request'}
                  </p>
                  <p className="font-bold text-slate-900 leading-snug truncate">{req.books?.title || 'Unknown Book'}</p>
                  <p className="text-sm text-slate-500 truncate">{req.books?.author || 'Unknown Author'}</p>
                  <p className="text-xs text-slate-400 font-mono mt-1">ISBN: {req.books?.isbn || 'N/A'}</p>
                </div>
              </div>

              <div className="hidden sm:block w-px bg-slate-100" />
              <div className="sm:hidden h-px w-full bg-slate-100" />

              {/* Borrower Info & Actions */}
              <div className="flex flex-col sm:w-1/2 justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Requested By</p>
                  <p className="font-bold text-slate-900 truncate">{req.profiles?.full_name || req.profiles?.email}</p>
                  <p className="text-sm font-medium text-slate-500 truncate">{req.profiles?.student_number || 'No ID assigned'}</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(req.borrowed_date).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => handleApprove(req.id, req.status, req.book_id)}
                    disabled={isPending}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-sm transition-all active:scale-[0.98] ${
                      req.status === 'pending' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(req.id, req.status, req.book_id)}
                    disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:opacity-50 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  )
}
