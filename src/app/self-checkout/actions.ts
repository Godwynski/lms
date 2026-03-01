'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function lookupBookForSelfCheckout(isbn: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: book } = await supabase.from('books').select('*').eq('isbn', isbn.trim()).single()
  
  if (!book) return { error: 'Book not found in our catalog.' }
  
  if (book.available_copies <= 0) {
    return { error: 'No available copies of this book right now.' }
  }

  return { book }
}

export async function processSelfCheckout(bookId: string) {
  const supabase = await createClient()

  // Verify caller
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Check if user already borrowed this book
  const { data: existing } = await supabase
    .from('borrowing_records')
    .select('id')
    .eq('borrower_id', user.id)
    .eq('book_id', bookId)
    .eq('status', 'borrowed')
    .single()

  if (existing) {
    return { error: 'You are already borrowing this book.' }
  }

  // Use the atomic stored procedure instead of independent reads/writes
  // For self-checkout, pass status 'pending' requiring admin approval.
  const { data, error } = await supabase.rpc('atomic_checkout', {
    p_borrower_id: user.id,
    p_book_id: bookId,
    p_status: 'pending'
  })

  // If the RPC fails entirely (DB connection, undefined function)
  if (error) {
    console.error('Checkout DB Error:', error)
    return { error: 'Failed to process checkout due to database error' }
  }

  // If the RPC throws an intentional business logic error (e.g. no copies)
  if (data?.error) {
    return { error: data.error }
  }

  revalidatePath('/self-checkout')
  revalidatePath('/')
  revalidatePath('/borrowings')
  return { success: true, message: 'Checkout successful!' }
}
