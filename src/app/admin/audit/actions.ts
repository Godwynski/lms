'use server'

import { getSession, getAdminDb } from '@/lib/auth/couchdb'



export type AuditBookResult = {
  id: string
  title: string
  author?: string | null
  isbn?: string | null
  shelf_location?: string | null
  available_copies: number
  total_copies: number
}

type PouchDoc = Record<string, unknown> & { _id: string }

const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']

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
      // Non-critical: fall through
    }
  }

  if (!hasAccess) return { error: 'Unauthorized' }
  return { db }
}

export async function getAllBooksForAudit(): Promise<AuditBookResult[]> {
  const { error, db } = await verifyStaff()
  if (error || !db) return []

  try {
    const res = await db.find({ selector: { type: 'book' } })
    const books = (res.docs as unknown as PouchDoc[]).map((b) => ({
      ...b,
      id: b._id,
      title: String(b.title ?? ''),
      author: b.author != null ? String(b.author) : null,
      isbn: b.isbn != null ? String(b.isbn) : null,
      shelf_location: b.shelf_location != null ? String(b.shelf_location) : null,
      available_copies: Number(b.available_copies ?? 0),
      total_copies: Number(b.total_copies ?? 0),
    }))
    return books.sort((a, b) => a.title.localeCompare(b.title || ''))
  } catch {
    return []
  }
}

export async function lookupBookByISBN(isbn: string): Promise<AuditBookResult | null> {
  const { error, db } = await verifyStaff()
  if (error || !db) return null

  try {
    const res = await db.find({ selector: { type: 'book', isbn } })
    if (res.docs.length === 0) return null
    const book = res.docs[0] as unknown as PouchDoc
    return {
      id: book._id,
      title: String(book.title ?? ''),
      author: book.author != null ? String(book.author) : null,
      isbn: book.isbn != null ? String(book.isbn) : null,
      shelf_location: book.shelf_location != null ? String(book.shelf_location) : null,
      available_copies: Number(book.available_copies ?? 0),
      total_copies: Number(book.total_copies ?? 0),
    }
  } catch {
    return null
  }
}
