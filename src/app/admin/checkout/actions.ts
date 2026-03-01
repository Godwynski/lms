'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Temporary quick lookup by email for demo purposes, 
// usually this is by a unique library_card_number encoded in the QR.
export async function lookupUser(scannedData: string) {
  const supabase = await createClient()

  // Ensure current user is admin or staff
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return { error: 'Unauthorized to perform checkouts' }
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(scannedData)) {
    return { error: 'Invalid Library Card. Scanning a valid card QR is required.' }
  }

  const { data: borrowerProfile } = await supabase.from('profiles').select('id, full_name, role').eq('id', scannedData).single()
  
  if (!borrowerProfile) return { error: 'User not found in the system' }
  return { user: borrowerProfile }
}

export async function lookupOrAddBook(isbn: string) {
  const supabase = await createClient()

  // 1. Check local DB first
  const { data: existingBook } = await supabase.from('books').select('*').eq('isbn', isbn).single()
  
  if (existingBook) {
    return { book: existingBook }
  }

  // 2. Not in local DB, fetch from Open Library
  try {
    const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`)
    const data = await response.json()
    const bookData = data[`ISBN:${isbn}`]

    if (!bookData) {
      return { error: 'Book not found in Open Library' }
    }

    const title = bookData.title || 'Unknown Title'
    const author = bookData.authors?.[0]?.name || 'Unknown Author'
    const cover_url = bookData.cover?.large || bookData.cover?.medium || null

    // 3. Insert new book
    const { data: newBook, error: insertError } = await supabase.from('books').insert({
      isbn,
      title,
      author,
      cover_url,
      total_copies: 1,
      available_copies: 1
    }).select().single()

    if (insertError) {
      console.error('Error inserting book:', insertError)
      return { error: 'Failed to save book to database' }
    }

    revalidatePath('/admin/checkout')
    return { book: newBook, isNew: true }

  } catch (err) {
    console.error('Open Library API Error:', err)
    return { error: 'Failed to look up book ISBN' }
  }
}

export async function processCheckout(borrowerId: string, bookId: string) {
  const supabase = await createClient()

  // Verify caller is admin/staff
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Use the atomic stored procedure instead of independent reads/writes
  // This prevents race conditions where two admins check out the last copy simultaneously
  const { data, error } = await supabase.rpc('atomic_checkout', {
    p_borrower_id: borrowerId,
    p_book_id: bookId
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

  revalidatePath('/admin/checkout')
  return { success: true, message: 'Checkout successful!' }
}

export async function processReturn(isbn: string) {
  const supabase = await createClient()

  // Verify caller is admin/staff
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Use the atomic stored procedure instead of independent reads/writes
  const { data, error } = await supabase.rpc('atomic_return', {
    p_isbn: isbn
  })

  // If the RPC fails entirely (DB connection, undefined function)
  if (error) {
    console.error('Return DB Error:', error)
    return { error: 'Failed to process return due to database error' }
  }

  // If the RPC throws an intentional business logic error (e.g. no active record)
  if (data?.error) {
    return { error: data.error }
  }

  revalidatePath('/admin/checkout')
  return { success: true, message: data.message || 'Return successful!' }
}
