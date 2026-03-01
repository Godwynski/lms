'use client'

import { useState, useEffect, useTransition } from 'react'
import { Star, MessageCircle, AlertCircle, Loader2, User } from 'lucide-react'
import { getReviews, submitReview } from './reviewActions'

type Profile = { full_name: string | null }
type Review = {
  id: string
  rating: number
  review_text: string | null
  created_at: string
  user_id: string
  profiles: Profile | null
}

export default function BookReviews({ bookId, currentUserId }: { bookId: string, currentUserId?: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [hasBorrowed, setHasBorrowed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)

  const userReview = currentUserId ? reviews.find(r => r.user_id === currentUserId) : null

  useEffect(() => {
    let mounted = true
    getReviews(bookId).then(res => {
      if (!mounted) return
      if (res.success && res.reviews) {
        const fetchedReviews = res.reviews as unknown as Review[]
        setReviews(fetchedReviews)
        setHasBorrowed(!!res.hasBorrowed)
        const existing = fetchedReviews.find(r => r.user_id === currentUserId)
        if (existing) {
          setRating(existing.rating)
          setReviewText(existing.review_text || '')
        }
      } else {
        setError(res.error || 'Failed to load reviews')
      }
      setIsLoading(false)
    })
    return () => { mounted = false }
  }, [bookId, currentUserId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    startTransition(async () => {
      setError(null)
      const res = await submitReview(bookId, rating, reviewText)
      if (res.success) {
        setShowForm(false)
        // Refresh reviews
        const refresh = await getReviews(bookId)
        if (refresh.success && refresh.reviews) {
          setReviews(refresh.reviews as unknown as Review[])
        }
      } else {
        setError(res.error || 'Failed to submit review')
      }
    })
  }

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
    : null

  return (
    <div className="mt-8 pt-6 border-t border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-indigo-500" aria-hidden="true" />
          Reviews & Ratings
        </h3>
        {averageRating && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-sm font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
            {averageRating} <span className="text-amber-500/50 text-xs font-semibold">({reviews.length})</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Review Form CTA / Form */}
          {currentUserId ? (
            !showForm && !userReview ? (
             hasBorrowed ? ( 
               <button 
                onClick={() => setShowForm(true)}
                className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors font-semibold text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Write a Review
              </button>
             ) : (
               <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                 You must borrow this book before you can leave a review.
               </p>
             )
            ) : (!showForm && userReview && (
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-indigo-900">You reviewed this book</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} className={`w-3.5 h-3.5 ${star <= userReview.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`} />
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => setShowForm(true)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 border border-indigo-200 bg-white px-3 py-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  Edit
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
              Log in to leave a review.
            </p>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-bold text-slate-700">Your Rating</label>
                {error && <span className="text-xs font-semibold text-rose-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {error}</span>}
              </div>
              <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    className="p-1 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg group"
                  >
                    <Star 
                      className={`w-7 h-7 transition-colors ${
                        star <= (hoverRating || rating) 
                          ? 'fill-amber-500 text-amber-500 scale-110' 
                          : 'text-slate-300 group-hover:text-amber-200'
                      }`} 
                    />
                  </button>
                ))}
              </div>
              
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-2">Review Details <span className="text-slate-400 font-normal">(Optional)</span></label>
                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  placeholder="What did you think of this book?"
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(null) }}
                  className="flex-1 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-200 transition-colors text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-[2] py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Review
                </button>
              </div>
            </form>
          )}

          {/* List Reviews */}
          <div className="space-y-4">
            {reviews.filter(r => r.user_id !== currentUserId || !showForm).map(review => (
              <div key={review.id} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{review.profiles?.full_name || 'Anonymous'}</p>
                    <p className="text-[10px] text-slate-400 font-medium tabular-nums">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 mb-2">
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} className={`w-3 h-3 ${star <= review.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-200'}`} />
                    ))}
                  </div>
                  {review.review_text && (
                    <p className="text-sm text-slate-600 leading-relaxed max-w-prose whitespace-pre-wrap">{review.review_text}</p>
                  )}
                </div>
              </div>
            ))}
            {reviews.length === 0 && !showForm && (
              <div className="text-center py-6 text-slate-500">
                <Star className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm font-medium">No reviews yet.</p>
                <p className="text-xs text-slate-400 mt-1">Be the first to share your thoughts!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
