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
  
  let borrowerId = scannedData
  if (!uuidRegex.test(scannedData)) {
     // If not a UUID, let's fetch the FIRST borrower profile as a fallback demo
     const { data: fallbackProfile } = await supabase.from('profiles').select('id, full_name').eq('role', 'borrower').limit(1).single()
     if (fallbackProfile) {
        borrowerId = fallbackProfile.id
     } else {
        return { error: 'Invalid library card and no default borrower found.' }
     }
  }

  const { data: borrowerProfile } = await supabase.from('profiles').select('id, full_name, role').eq('id', borrowerId).single()
  
  if (!borrowerProfile) return { error: 'User not found' }
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

  // Verify book is available
  const { data: book } = await supabase.from('books').select('available_copies').eq('id', bookId).single()
  
  if (!book || book.available_copies <= 0) {
    return { error: 'Book is not available for checkout' }
  }

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 14) // 14 days borrowing period

  // Start checkout transaction
  const { error: checkoutError } = await supabase.from('borrowing_records').insert({
    book_id: bookId,
    borrower_id: borrowerId,
    due_date: dueDate.toISOString(),
    status: 'borrowed'
  })

  if (checkoutError) {
    return { error: 'Failed to create borrowing record' }
  }

  // Decrement available copies
  const { error: updateError } = await supabase.from('books').update({
    available_copies: book.available_copies - 1
  }).eq('id', bookId)

  if (updateError) {
    // Ideally we would rollback, but simple setup for demo
    console.error('Failed to decrement copies')
  }

  revalidatePath('/admin/checkout')
  return { success: true, message: 'Checkout successful!' }
}

export async function processReturn(isbn: string) {
  const supabase = await createClient()

  // 1. Find book by ISBN
  const { data: book } = await supabase.from('books').select('id, available_copies, title').eq('isbn', isbn).single()
  
  if (!book) {
    return { error: 'Book not found in the local library system.' }
  }

  // 2. Find the active borrowing record for this book
  // (Assuming there could be multiple copies, we find the oldest active borrow for this book id)
  const { data: activeRecord } = await supabase
    .from('borrowing_records')
    .select('id')
    .eq('book_id', book.id)
    .eq('status', 'borrowed')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!activeRecord) {
    return { error: `No active borrowing records found for "${book.title}". It might already be returned or was never checked out.` }
  }

  // 3. Mark the record as returned
  const { error: returnError } = await supabase
    .from('borrowing_records')
    .update({ 
      status: 'returned',
      returned_date: new Date().toISOString()
    })
    .eq('id', activeRecord.id)

  if (returnError) {
    console.error('Failed to return record', returnError)
    return { error: 'Failed to update borrowing record' }
  }

  // 4. Increment the available copies for the book
  const { error: incrementError } = await supabase
    .from('books')
    .update({ available_copies: book.available_copies + 1 })
    .eq('id', book.id)

  if (incrementError) {
     console.error('Failed to increment copies', incrementError)
  }

  revalidatePath('/admin/checkout')
  return { success: true, message: `Successfully returned "${book.title}"!` }
}
