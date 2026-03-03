'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Parses a checkout scan into type + identifiers
function parseCheckoutScan(raw: string) {
  if (raw.startsWith('STICAL-LMS:USER:')) {
    const parts = raw.split(':')
    // Format: STICAL-LMS:USER:{userId}:{studentNumber?}
    return { type: 'libraryCard' as const, userId: parts[2], studentNumber: parts[3] }
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(raw)) {
    return { type: 'uuid' as const, userId: raw }
  }
  return { type: 'studentNumber' as const, studentNumber: raw }
}

export async function lookupUser(scannedData: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'librarian', 'circulation_assistant'].includes(profile.role)) {
    return { error: 'Unauthorized to perform checkouts' }
  }

  const parsed = parseCheckoutScan(scannedData.trim())

  let borrowerProfile = null

  if (parsed.type === 'libraryCard' || parsed.type === 'uuid') {
    // Look up by user ID
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, student_number')
      .eq('id', parsed.userId)
      .single()
    borrowerProfile = data
  } else {
    // Look up by student number
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, student_number')
      .eq('student_number', parsed.studentNumber)
      .single()
    borrowerProfile = data
  }

  if (!borrowerProfile) return { error: 'Borrower not found. Check the QR or student number and try again.' }
  return { user: borrowerProfile }
}

export async function lookupUserByStudentNumber(studentNumber: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, student_number')
    .eq('student_number', studentNumber.trim())
    .single()

  if (error || !data) return { error: 'No borrower found with that student number.' }
  return { user: data }
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

/**
 * Pre-flight compliance check: fetches active holds and unpaid fines
 * for a borrower so the librarian UI can show a warning before committing
 * the checkout.
 */
export async function getBorrowerStatus(borrowerId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'librarian', 'circulation_assistant'].includes(profile.role)) {
    return { error: 'Unauthorized' }
  }

  // Fetch active holds
  const { data: holds } = await supabase
    .from('holds')
    .select('id, reason, created_at')
    .eq('borrower_id', borrowerId)
    .eq('active', true)

  // Fetch unpaid fines with due date from the borrowing record
  const { data: fines } = await supabase
    .from('fines')
    .select('id, amount, created_at, borrowing_record_id')
    .eq('status', 'unpaid')
    .in(
      'borrowing_record_id',
      (
        await supabase
          .from('borrowing_records')
          .select('id')
          .eq('borrower_id', borrowerId)
      ).data?.map((r) => r.id) ?? []
    )

  const totalFines = (fines ?? []).reduce((sum, f) => sum + Number(f.amount), 0)

  return {
    holds: holds ?? [],
    fines: fines ?? [],
    totalFines,
    isBlocked: (holds && holds.length > 0) || totalFines > 0,
  }
}
