'use server'

import { getSession, getAdminDb } from '@/lib/auth/couchdb'
import { revalidatePath } from 'next/cache'



const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']

export type ImportBookRow = {
  title: string
  author?: string
  isbn?: string
  ddc_call_number?: string
  publisher?: string
  publication_year?: number | null
  total_copies?: number
  shelf_location?: string
  category?: string
  genre?: string
  language?: string
  page_count?: number | null
  description?: string
}

export async function importBooks(rows: ImportBookRow[]): Promise<{ imported: number; error?: string }> {
  const session = await getSession()
  const userId = session?.userCtx?.name
  if (!userId) return { imported: 0, error: 'Unauthorized' }

  const db = await getAdminDb()
  const roles = session?.userCtx?.roles || []
  let hasAccess = STAFF_ROLES.some(r => roles.includes(r))

  if (!hasAccess) {
    try {
      const profileDocs = await db.find({ selector: { type: 'profile', user_id: userId } })
      const firstDoc = profileDocs.docs[0] as unknown as Record<string, unknown>
      if (profileDocs.docs.length > 0 && STAFF_ROLES.includes(String(firstDoc?.role ?? ''))) {
        hasAccess = true
      }
    } catch {
      // Non-critical: fall through, access remains false
    }
  }

  if (!hasAccess) return { imported: 0, error: 'Unauthorized' }

  if (!rows.length) return { imported: 0, error: 'No rows to import.' }

  // Sanitise rows — remove empty keys, coerce numeric fields
  const clean = rows
    .filter(r => r.title?.trim())
    .map(r => ({
      type: 'book',
      title: r.title.trim(),
      author: r.author?.trim() || null,
      isbn: r.isbn?.trim() || null,
      ddc_call_number: r.ddc_call_number?.trim() || null,
      publisher: r.publisher?.trim() || null,
      publication_year: r.publication_year ? Number(r.publication_year) : null,
      total_copies: r.total_copies ? Number(r.total_copies) : 1,
      available_copies: r.total_copies ? Number(r.total_copies) : 1,
      shelf_location: r.shelf_location?.trim() || null,
      category: r.category?.trim() || null,
      genre: r.genre?.trim() || null,
      language: r.language?.trim() || null,
      page_count: r.page_count ? Number(r.page_count) : null,
      description: r.description?.trim() || null,
      created_at: new Date().toISOString()
    }))

  if (!clean.length) return { imported: 0, error: 'No valid rows found (ensure "title" column is present).' }

  let totalImported = 0

  try {
    for (const book of clean) {
      if (book.isbn) {
        // Upsert by ISBN
        const existing = await db.find({ selector: { type: 'book', isbn: book.isbn } })
        if (existing.docs.length > 0) {
          const doc = existing.docs[0] as unknown as PouchDB.Core.ExistingDocument<Record<string, unknown>>
          await db.put({ ...doc, ...book, _id: doc._id, _rev: doc._rev })
        } else {
          await db.put({ ...book, _id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` })
        }
      } else {
        await db.post(book)
      }
      totalImported++
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { imported: totalImported, error: message }
  }

  revalidatePath('/catalog')
  revalidatePath('/admin/books')
  revalidatePath('/admin/data-hub')

  return { imported: totalImported }
}
