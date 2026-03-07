'use client'

/**
 * useReadingListMutations
 *
 * Client-side mutations for reading lists that write directly to the local
 * PowerSync SQLite database. The connector's uploadData() automatically
 * queues these writes and syncs them to Supabase in the background.
 *
 * This means mutations are INSTANT (no round-trip) and work completely offline.
 */

import { useLmsDb } from '@/lib/powersync/PowerSyncProvider'
import { useCallback } from 'react'

// Generates a UUID v4 compatible with PowerSync's id field
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function useReadingListMutations(userId: string) {
  const db = useLmsDb()

  /**
   * Create a new reading list locally.
   * Returns the new list id so the UI can optimistically update.
   */
  const createList = useCallback(async (name: string) => {
    const id = generateId()
    const now = new Date().toISOString()
    try {
      await db.execute(
        `INSERT INTO reading_lists (id, user_id, name, created_at) VALUES (?, ?, ?, ?)`,
        [id, userId, name.trim(), now]
      )
      return { success: true, list: { id, name: name.trim(), created_at: now } }
    } catch (e: unknown) {
      console.error('[PowerSync] createList error:', e)
      return { error: 'Failed to create reading list' }
    }
  }, [db, userId])

  /**
   * Delete a reading list and all its books locally.
   * PowerSync queues the DELETE for upload to Supabase.
   */
  const deleteList = useCallback(async (listId: string) => {
    try {
      // Delete books first (cascade constraint compliance)
      await db.execute(
        `DELETE FROM reading_list_books WHERE list_id = ?`,
        [listId]
      )
      await db.execute(
        `DELETE FROM reading_lists WHERE id = ? AND user_id = ?`,
        [listId, userId]
      )
      return { success: true }
    } catch (e: unknown) {
      console.error('[PowerSync] deleteList error:', e)
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
      await db.execute(
        `INSERT OR IGNORE INTO reading_list_books (id, list_id, book_id, added_at) VALUES (?, ?, ?, ?)`,
        [id, listId, bookId, now]
      )
      return { success: true }
    } catch (e: unknown) {
      console.error('[PowerSync] addBook error:', e)
      return { error: 'Failed to add book to list' }
    }
  }, [db])

  /**
   * Remove a book from a reading list locally.
   */
  const removeBook = useCallback(async (bookId: string, listId: string) => {
    try {
      await db.execute(
        `DELETE FROM reading_list_books WHERE list_id = ? AND book_id = ?`,
        [listId, bookId]
      )
      return { success: true }
    } catch (e: unknown) {
      console.error('[PowerSync] removeBook error:', e)
      return { error: 'Failed to remove book from list' }
    }
  }, [db])

  return { createList, deleteList, addBook, removeBook }
}
