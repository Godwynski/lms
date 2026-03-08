'use server'

import { getSession, getAdminDb } from '@/lib/auth/couchdb'
import { revalidatePath } from 'next/cache'



const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']

type PouchDoc = Record<string, unknown> & { _id: string; _rev: string }

// Utility to verify staff role
async function verifyStaff() {
  const session = await getSession()
  const userId = session?.userCtx?.name
  if (!userId) return { error: 'Unauthorized' }

  const db = await getAdminDb()
  const roles = session?.userCtx?.roles || []
  let hasAccess = STAFF_ROLES.some(r => roles.includes(r))

  if (!hasAccess) {
    try {
      const profileDocs = await db.find({ selector: { type: 'profile', user_id: userId } })
      const firstDoc = profileDocs.docs[0] as unknown as PouchDoc
      if (profileDocs.docs.length > 0 && STAFF_ROLES.includes(String(firstDoc?.role ?? ''))) {
        hasAccess = true
      }
    } catch {
      // Non-critical: fall through, access remains false
    }
  }

  if (!hasAccess) return { error: 'Unauthorized to perform checkouts' }
  return { db, userId }
}

function parseCheckoutScan(raw: string) {
  if (raw.startsWith('STICAL-LMS:USER:')) {
    const parts = raw.split(':')
    return { type: 'libraryCard' as const, userId: parts[2], studentNumber: parts[3] }
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(raw)) {
    return { type: 'uuid' as const, userId: raw }
  }
  return { type: 'studentNumber' as const, studentNumber: raw }
}

export async function lookupUser(scannedData: string) {
  const { error, db } = await verifyStaff()
  if (error || !db) return { error }

  const parsed = parseCheckoutScan(scannedData.trim())

  let borrowerProfile: PouchDoc | null = null

  if (parsed.type === 'libraryCard' || parsed.type === 'uuid') {
    const res = await db.find({ selector: { type: 'profile', user_id: parsed.userId } })
    if (res.docs.length > 0) borrowerProfile = res.docs[0] as unknown as PouchDoc
  } else {
    const res = await db.find({ selector: { type: 'profile', student_number: parsed.studentNumber } })
    if (res.docs.length > 0) borrowerProfile = res.docs[0] as unknown as PouchDoc
  }

  if (!borrowerProfile) return { error: 'Borrower not found. Check the QR or student number and try again.' }
  return { user: { ...borrowerProfile, id: borrowerProfile.user_id } }
}

export async function lookupUserByStudentNumber(studentNumber: string) {
  const { error, db } = await verifyStaff()
  if (error || !db) return { error }

  const res = await db.find({ selector: { type: 'profile', student_number: studentNumber.trim() } })
  if (res.docs.length === 0) return { error: 'No borrower found with that student number.' }
  
  const borrowerProfile = res.docs[0] as unknown as PouchDoc
  return { user: { ...borrowerProfile, id: borrowerProfile.user_id } }
}

export async function lookupOrAddBook(isbn: string) {
  const { error, db } = await verifyStaff()
  if (error || !db) return { error }

  const res = await db.find({ selector: { type: 'book', isbn } })
  if (res.docs.length > 0) {
    const book = res.docs[0] as unknown as PouchDoc
    return { book: { ...book, id: book._id } }
  }

  try {
    const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`)
    const data = await response.json() as Record<string, Record<string, unknown>>
    const bookData = data[`ISBN:${isbn}`]

    if (!bookData) {
      return { error: 'Book not found in Open Library' }
    }

    const authors = bookData.authors as Array<{ name: string }> | undefined
    const cover = bookData.cover as Record<string, string> | undefined

    const title = String(bookData.title ?? 'Unknown Title')
    const author = authors?.[0]?.name ?? 'Unknown Author'
    const cover_url = cover?.large ?? cover?.medium ?? null

    const newBook = {
      _id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: 'book',
      isbn,
      title,
      author,
      cover_image_url: cover_url, 
      total_copies: 1,
      available_copies: 1,
      created_at: new Date().toISOString()
    }

    try {
      await db.put(newBook)
    } catch {
      return { error: 'Failed to save book to database' }
    }

    revalidatePath('/admin/checkout')
    return { book: { ...newBook, id: newBook._id }, isNew: true }

  } catch (err: unknown) {
    console.error('Open Library API Error:', err)
    return { error: 'Failed to look up book ISBN' }
  }
}

export async function processCheckout(borrowerId: string, bookId: string) {
  const { error, db } = await verifyStaff()
  if (error || !db) return { error }

  try {
    const book = await db.get(bookId) as unknown as PouchDoc
    if (Number(book.available_copies ?? 0) <= 0) {
      return { error: 'No copies available for checkout.' }
    }

    await db.put({ ...book, available_copies: Number(book.available_copies ?? 0) - 1 })

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14)

    const record = {
      _id: `borrowing_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: 'borrowing_record',
      borrower_id: borrowerId,
      book_id: bookId,
      status: 'borrowed',
      borrowed_date: new Date().toISOString(),
      due_date: dueDate.toISOString(),
      returned_date: null
    }

    await db.put(record)
    
  } catch (err: unknown) {
    const asObj = err as { status?: number }
    if (asObj?.status === 409) return { error: 'Concurrency error: Try again.' }
    return { error: 'Failed to process checkout due to database error' }
  }

  revalidatePath('/admin/checkout')
  return { success: true, message: 'Checkout successful!' }
}

export async function processReturn(isbn: string) {
  const { error, db } = await verifyStaff()
  if (error || !db) return { error }

  try {
    const booksRes = await db.find({ selector: { type: 'book', isbn } })
    if (booksRes.docs.length === 0) return { error: 'Book with this ISBN not found in the system.' }
    const book = booksRes.docs[0] as unknown as PouchDoc

    let recordsRes = await db.find({
      selector: {
        type: 'borrowing_record',
        book_id: book._id,
        status: { $in: ['borrowed', 'overdue'] }
      }
    })

    if (recordsRes.docs.length === 0) {
      const pendingRes = await db.find({
        selector: {
           type: 'borrowing_record',
           book_id: book._id,
           status: 'pending_return'
        }
      })
      if (pendingRes.docs.length === 0) {
        return { error: 'This book is not currently checked out.' }
      }
      recordsRes = pendingRes
    }

    const sortedDocs = (recordsRes.docs as unknown as PouchDoc[]).sort((x, y) =>
      new Date(String(x.borrowed_date ?? 0)).getTime() - new Date(String(y.borrowed_date ?? 0)).getTime()
    )
    const recordToReturn = sortedDocs[0]

    await db.put({ ...recordToReturn, status: 'returned', returned_date: new Date().toISOString() })
    await db.put({ ...book, available_copies: Number(book.available_copies ?? 0) + 1 })

  } catch (err: unknown) {
    const asObj = err as { status?: number; message?: string }
    if (asObj?.status === 409) return { error: 'Concurrency error: Try again.' }
    return { error: `Failed to process return: ${asObj?.message ?? String(err)}` }
  }

  revalidatePath('/admin/checkout')
  return { success: true, message: 'Return successful!' }
}

export async function getBorrowerStatus(borrowerId: string) {
  const { error, db } = await verifyStaff()
  if (error || !db) return { error: 'Unauthorized' }

  type HoldOrFine = Record<string, unknown> & { _id: string }
  let holds: HoldOrFine[] = []
  let fines: HoldOrFine[] = []
  let totalFines = 0

  try {
    const holdsRes = await db.find({ selector: { type: 'hold', borrower_id: borrowerId, active: true } })
    holds = (holdsRes.docs as unknown as HoldOrFine[]).map(h => ({ ...h, id: h._id }))

    const recordsRes = await db.find({ selector: { type: 'borrowing_record', borrower_id: borrowerId } })
    const recordIds = (recordsRes.docs as unknown as HoldOrFine[]).map(r => r._id)
    
    if (recordIds.length > 0) {
      const finesRes = await db.find({ 
        selector: { 
          type: 'fine', 
          status: 'unpaid', 
          borrowing_record_id: { $in: recordIds } 
        } 
      })
      fines = (finesRes.docs as unknown as HoldOrFine[]).map(f => ({ ...f, id: f._id }))
      totalFines = fines.reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
    }
  } catch(err: unknown) {
    console.error('Error fetching borrower status:', err)
  }

  return {
    holds,
    fines,
    totalFines,
    isBlocked: holds.length > 0 || totalFines > 0,
  }
}
