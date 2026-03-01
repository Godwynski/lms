'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']

/**
 * Directly process a return on behalf of staff at the desk.
 * This does NOT require approval — it is the staff-side return action.
 */
export async function processDirectReturn(recordId: string, bookId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !STAFF_ROLES.includes(profile.role)) {
    return { error: 'Insufficient permissions to process returns' }
  }

  // 1. Mark the record as returned
  const { error: updateError } = await supabase
    .from('borrowing_records')
    .update({
      status: 'returned',
      returned_date: new Date().toISOString(),
    })
    .eq('id', recordId)
    .in('status', ['borrowed', 'overdue', 'pending_return'])

  if (updateError) {
    console.error('Direct return error:', updateError)
    return { error: 'Failed to process return. Please try again.' }
  }

  // 2. Increment available copies (try RPC first, fallback to manual)
  const { error: rpcError } = await supabase.rpc('increment_available_copies', { p_book_id: bookId })

  if (rpcError) {
    // Fallback: manual increment
    const { data: book } = await supabase
      .from('books')
      .select('available_copies')
      .eq('id', bookId)
      .single()

    if (book) {
      await supabase
        .from('books')
        .update({ available_copies: book.available_copies + 1 })
        .eq('id', bookId)
    }
  }

  revalidatePath('/admin/borrowings')
  revalidatePath('/admin/approvals')
  revalidatePath('/')
  return { success: true }
}
