'use client'

/**
 * useAdminBorrowingMutations
 *
 * Wraps the admin server actions (approve, reject, direct return) and applies
 * an immediate LOCAL sqlite update after each successful server-side operation.
 *
 * Why: The server action writes to Supabase; the PowerSync connector would
 * eventually sync the change back to local SQLite — but that can take seconds.
 * By writing the state change locally FIRST (or immediately after the server
 * confirms success), the admin UI updates instantly without a visible lag.
 */

import { useLmsDb } from '@/lib/powersync/PowerSyncProvider'
import { useCallback } from 'react'
import { approveRequest, rejectRequest, approveReturnRequest, rejectReturnRequest } from '@/app/admin/approvals/actions'
import { processDirectReturn } from '@/app/admin/borrowings/actions'

export function useAdminBorrowingMutations() {
  const db = useLmsDb()

  /**
   * Approve a borrow request.
   * Server action updates Supabase; we mirror the status in local SQLite immediately.
   */
  const approve = useCallback(async (recordId: string) => {
    const res = await approveRequest(recordId)
    if (res.success) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 14)
      // Mirror the update locally so the Loader's useQuery reflects immediately
      await db.execute(
        `UPDATE borrowing_records SET status = 'borrowed', due_date = ? WHERE id = ?`,
        [dueDate.toISOString(), recordId]
      ).catch(console.warn) // non-blocking — PowerSync sync will correct any discrepancy
    }
    return res
  }, [db])

  /**
   * Reject a borrow request.
   */
  const reject = useCallback(async (recordId: string, bookId: string) => {
    const res = await rejectRequest(recordId, bookId)
    if (res.success) {
      await db.execute(
        `UPDATE borrowing_records SET status = 'rejected' WHERE id = ?`,
        [recordId]
      ).catch(console.warn)
      // Also restore copy count locally
      await db.execute(
        `UPDATE books SET available_copies = available_copies + 1 WHERE id = ?`,
        [bookId]
      ).catch(console.warn)
    }
    return res
  }, [db])

  /**
   * Approve a pending_return request.
   */
  const approveReturn = useCallback(async (recordId: string, bookId: string) => {
    const res = await approveReturnRequest(recordId, bookId)
    if (res.success) {
      const now = new Date().toISOString()
      await db.execute(
        `UPDATE borrowing_records SET status = 'returned', returned_date = ? WHERE id = ?`,
        [now, recordId]
      ).catch(console.warn)
      await db.execute(
        `UPDATE books SET available_copies = available_copies + 1 WHERE id = ?`,
        [bookId]
      ).catch(console.warn)
    }
    return res
  }, [db])

  /**
   * Reject a pending_return (revert to borrowed).
   */
  const rejectReturn = useCallback(async (recordId: string) => {
    const res = await rejectReturnRequest(recordId)
    if (res.success) {
      await db.execute(
        `UPDATE borrowing_records SET status = 'borrowed' WHERE id = ?`,
        [recordId]
      ).catch(console.warn)
    }
    return res
  }, [db])

  /**
   * Process a direct (staff desk) return.
   */
  const directReturn = useCallback(async (recordId: string, bookId: string) => {
    const res = await processDirectReturn(recordId, bookId)
    if (res.success) {
      const now = new Date().toISOString()
      await db.execute(
        `UPDATE borrowing_records SET status = 'returned', returned_date = ? WHERE id = ?`,
        [now, recordId]
      ).catch(console.warn)
      await db.execute(
        `UPDATE books SET available_copies = available_copies + 1 WHERE id = ?`,
        [bookId]
      ).catch(console.warn)
    }
    return res
  }, [db])

  return { approve, reject, approveReturn, rejectReturn, directReturn }
}
