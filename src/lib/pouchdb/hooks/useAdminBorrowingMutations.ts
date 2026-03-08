'use client'

/**
 * useAdminBorrowingMutations
 *
 * Wraps the admin server actions and applies an immediate LOCAL PouchDB update 
 * after each successful server-side operation for instant UI updates.
 */

import { usePouchDb } from '@/lib/pouchdb/PouchDBProvider'
import { useCallback } from 'react'
import { approveRequest, rejectRequest, approveReturnRequest, rejectReturnRequest } from '@/app/admin/approvals/actions'
import { processDirectReturn } from '@/app/admin/borrowings/actions'

export function useAdminBorrowingMutations() {
  const db = usePouchDb()

  const updateStatus = useCallback(async (recordId: string, status: string, dateField?: { key: string, val: string }) => {
    try {
      const doc = await db.get(recordId) as Record<string, unknown>
      doc.status = status
      if (dateField) {
        doc[dateField.key] = dateField.val
      }
      await db.put(doc)
    } catch (e) { console.warn(e) }
  }, [db])

  const updateBookCopies = useCallback(async (bookId: string, delta: number) => {
    try {
      const book = await db.get(bookId) as Record<string, unknown>
      book.available_copies = (Number(book.available_copies) || 0) + delta
      await db.put(book)
    } catch (e) { console.warn(e) }
  }, [db])

  /**
   * Approve a borrow request.
   */
  const approve = useCallback(async (recordId: string) => {
    const res = await approveRequest(recordId)
    if (res.success) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 14)
      await updateStatus(recordId, 'borrowed', { key: 'due_date', val: dueDate.toISOString() })
    }
    return res
  }, [updateStatus])

  /**
   * Reject a borrow request.
   */
  const reject = useCallback(async (recordId: string, bookId: string) => {
    const res = await rejectRequest(recordId, bookId)
    if (res.success) {
      await updateStatus(recordId, 'rejected')
      await updateBookCopies(bookId, 1)
    }
    return res
  }, [updateStatus, updateBookCopies])

  /**
   * Approve a pending_return request.
   */
  const approveReturn = useCallback(async (recordId: string, bookId: string) => {
    const res = await approveReturnRequest(recordId, bookId)
    if (res.success) {
      const now = new Date().toISOString()
      await updateStatus(recordId, 'returned', { key: 'returned_date', val: now })
      await updateBookCopies(bookId, 1)
    }
    return res
  }, [updateStatus, updateBookCopies])

  /**
   * Reject a pending_return (revert to borrowed).
   */
  const rejectReturn = useCallback(async (recordId: string) => {
    const res = await rejectReturnRequest(recordId)
    if (res.success) {
      await updateStatus(recordId, 'borrowed')
    }
    return res
  }, [updateStatus])

  /**
   * Process a direct (staff desk) return.
   */
  const directReturn = useCallback(async (recordId: string, bookId: string) => {
    const res = await processDirectReturn(recordId, bookId)
    if (res.success) {
      const now = new Date().toISOString()
      await updateStatus(recordId, 'returned', { key: 'returned_date', val: now })
      await updateBookCopies(bookId, 1)
    }
    return res
  }, [updateStatus, updateBookCopies])

  return { approve, reject, approveReturn, rejectReturn, directReturn }
}
