'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitReview(bookId: string, rating: number, reviewText: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be logged in to review.' }
  }

  // Check if user has already reviewed
  const { data: existing } = await supabase
    .from('book_reviews')
    .select('id')
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('book_reviews')
      .update({ rating, review_text: reviewText, updated_at: new Date().toISOString() })
      .eq('id', existing.id)

    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('book_reviews')
      .insert({
        book_id: bookId,
        user_id: user.id,
        rating,
        review_text: reviewText,
      })

    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/catalog')
  return { success: true }
}

export async function getReviews(bookId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('book_reviews')
    .select('id, rating, review_text, created_at, user_id, profiles(full_name)')
    .eq('book_id', bookId)
    .order('created_at', { ascending: false })

  if (error) return { success: false, error: error.message }

  let hasBorrowed = false
  if (user) {
    const { data: borrowed } = await supabase
      .from('borrowing_records')
      .select('id')
      .eq('book_id', bookId)
      .eq('borrower_id', user.id)
      .limit(1)
    hasBorrowed = !!(borrowed && borrowed.length > 0)
  }

  return { success: true, reviews: data, hasBorrowed }
}
