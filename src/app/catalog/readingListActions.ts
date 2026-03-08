'use server'

import { getSession } from '@/lib/auth/couchdb'
import { revalidatePath } from 'next/cache'
import PouchDB from 'pouchdb'
import PouchDBFind from 'pouchdb-find'

PouchDB.plugin(PouchDBFind)

const COUCHDB_URL = process.env.NEXT_PUBLIC_COUCHDB_URL || 'http://localhost:5984'

async function getDb() {
  return new PouchDB(`${COUCHDB_URL}/lms`, { skip_setup: true })
}

export async function addToReadingList(bookId: string, listId: string) {
  const session = await getSession()
  if (!session?.userCtx?.name) return { error: 'Not authenticated' }

  try {
    const db = await getDb()
    
    // Check if it already exists
    const existing = await db.find({
      selector: { type: 'reading_list_book', list_id: listId, book_id: bookId }
    })

    if (existing.docs.length > 0) {
      return { error: 'Book is already in this list' }
    }

    await db.post({
      type: 'reading_list_book',
      list_id: listId,
      book_id: bookId,
      created_at: new Date().toISOString()
    })

    revalidatePath('/catalog')
    revalidatePath('/reading-lists')
    return { success: true }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function removeFromReadingList(bookId: string, listId: string) {
  const session = await getSession()
  if (!session?.userCtx?.name) return { error: 'Not authenticated' }

  try {
    const db = await getDb()
    
    const existing = await db.find({
      selector: { type: 'reading_list_book', list_id: listId, book_id: bookId }
    })

    for (const doc of existing.docs) {
      await db.remove(doc._id, doc._rev)
    }

    revalidatePath('/catalog')
    revalidatePath('/reading-lists')
    return { success: true }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function createReadingList(name: string) {
  const session = await getSession()
  const userId = session?.userCtx?.name
  if (!userId) return { error: 'Not authenticated' }

  try {
    const db = await getDb()
    
    const res = await db.post({
      type: 'reading_list',
      user_id: userId,
      name: name.trim(),
      created_at: new Date().toISOString()
    })

    const list = await db.get(res.id)

    revalidatePath('/catalog')
    revalidatePath('/reading-lists')
    return { success: true, list }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function deleteReadingList(listId: string) {
  const session = await getSession()
  const userId = session?.userCtx?.name
  if (!userId) return { error: 'Not authenticated' }

  try {
    const db = await getDb()
    
    // Delete the list itself
    const list = await db.get(listId)
    // Basic authorization check
    if ((list as unknown as Record<string, unknown>).user_id !== userId) {
      return { error: 'Not authorized to delete this list' }
    }
    
    await db.remove(list._id, list._rev)

    // Delete all books in the list
    const booksInList = await db.find({
      selector: { type: 'reading_list_book', list_id: listId }
    })

    for (const doc of booksInList.docs) {
      await db.remove(doc._id, doc._rev)
    }

    revalidatePath('/reading-lists')
    return { success: true }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
