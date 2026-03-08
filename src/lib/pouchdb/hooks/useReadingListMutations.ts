'use client'

/**
 * useReadingListMutations
 *
 * Client-side mutations for reading lists that write directly to the local
 * PouchDB database. This provides instant feedback, and background sync replicates it.
 */

import { usePouchDb } from '@/lib/pouchdb/PouchDBProvider'
import { useCallback } from 'react'

// Generates a UUID v4 compatible id field
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function useReadingListMutations(userId: string) {
  const db = usePouchDb()

  /**
   * Create a new reading list locally.
   * Returns the new list id so the UI can optimistically update.
   */
  const createList = useCallback(async (name: string) => {
    const id = generateId()
    const now = new Date().toISOString()
    try {
      await db.put({
        _id: id,
        type: 'reading_list',
        user_id: userId,
        name: name.trim(),
        created_at: now
      })
      return { success: true, list: { id, name: name.trim(), created_at: now } }
    } catch (e: unknown) {
      console.error('[PouchDB] createList error:', e)
      return { error: 'Failed to create reading list' }
    }
  }, [db, userId])

  /**
   * Delete a reading list and all its books locally.
   */
  const deleteList = useCallback(async (listId: string) => {
    try {
      // Delete books first
      const books = await db.find({ selector: { type: 'reading_list_book', list_id: listId } })
      await Promise.all(books.docs.map(doc => db.remove(doc as Record<string, unknown> & { _id: string; _rev: string })))
      
      const listDoc = await db.get(listId)
      if (listDoc && (listDoc as unknown as Record<string, unknown>).user_id === userId) {
        await db.remove(listDoc)
      }
      return { success: true }
    } catch (e: unknown) {
      console.error('[PouchDB] deleteList error:', e)
      return { error: 'Failed to delete reading list' }
    }
  }, [db, userId])

  /**
   * Add a book to a reading list locally.
   */
  const addBook = useCallback(async (bookId: string, listId: string) => {
    const id = generateId()
    const now = new Date().toISOString()
    try {
      // mimic INSERT OR IGNORE
      const existing = await db.find({ selector: { type: 'reading_list_book', list_id: listId, book_id: bookId } })
      if (existing.docs.length > 0) return { success: true }

      await db.put({
        _id: id,
        type: 'reading_list_book',
        list_id: listId,
        book_id: bookId,
        added_at: now
      })
      return { success: true }
    } catch (e: unknown) {
      console.error('[PouchDB] addBook error:', e)
      return { error: 'Failed to add book to list' }
    }
  }, [db])

  /**
   * Remove a book from a reading list locally.
   */
  const removeBook = useCallback(async (bookId: string, listId: string) => {
    try {
      const existing = await db.find({ selector: { type: 'reading_list_book', list_id: listId, book_id: bookId } })
      await Promise.all(existing.docs.map(doc => db.remove(doc as Record<string, unknown> & { _id: string; _rev: string })))
      return { success: true }
    } catch (e: unknown) {
      console.error('[PouchDB] removeBook error:', e)
      return { error: 'Failed to remove book from list' }
    }
  }, [db])

  return { createList, deleteList, addBook, removeBook }
}
