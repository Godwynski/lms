'use server'

import { getSession, getAdminDb } from '@/lib/auth/couchdb'
import { revalidatePath } from 'next/cache'



const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']

type PouchDoc = Record<string, unknown> & { _id: string; _rev: string }

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

  if (!hasAccess) return { error: 'Unauthorized role' }
  return { db }
}

export async function processDirectReturn(recordId: string, bookId: string) {
  const { error, db } = await verifyStaff()
  if (error || !db) return { error }

  try {
    const record = await db.get(recordId) as unknown as PouchDoc
    if (!['borrowed', 'overdue', 'pending_return'].includes(String(record.status ?? ''))) {
      return { error: 'Record is not in a returnable state' }
    }
    await db.put({ ...record, status: 'returned', returned_date: new Date().toISOString() })

    const book = await db.get(bookId) as unknown as PouchDoc
    await db.put({ ...book, available_copies: Number(book.available_copies ?? 0) + 1 })

  } catch (updateError: unknown) {
    console.error('Direct return error:', updateError)
    return { error: 'Failed to process return. Please try again.' }
  }

  revalidatePath('/admin/borrowings')
  revalidatePath('/admin/approvals')
  revalidatePath('/')
  return { success: true }
}
