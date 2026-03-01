'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approveRequest(recordId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'librarian', 'circulation_assistant'].includes(profile.role)) {
    return { error: 'Unauthorized role' }
  }

  // Calculate new due date explicitly from the moment of approval
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 14) // 14 days later

  const { error } = await supabase
    .from('borrowing_records')
    .update({ status: 'borrowed', due_date: dueDate.toISOString() })
    .eq('id', recordId)
    .eq('status', 'pending')

  if (error) {
    console.error('Approval Error:', error)
    return { error: 'Failed to approve request' }
  }

  revalidatePath('/admin/approvals')
  revalidatePath('/')
  return { success: true }
}

export async function rejectRequest(recordId: string, bookId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'librarian', 'circulation_assistant'].includes(profile.role)) {
    return { error: 'Unauthorized role' }
  }

  // 1. Mark status as 'rejected'
  const { error: updateError } = await supabase
    .from('borrowing_records')
    .update({ status: 'rejected' })
    .eq('id', recordId)
    .eq('status', 'pending')

  if (updateError) {
    console.error('Rejection Error:', updateError)
    return { error: 'Failed to reject request' }
  }

  // 2. Increment available copies back
  await supabase.rpc('increment_available_copies', { p_book_id: bookId }).then(res => {
     if(res.error) {
         // Fallback if RPC doesn't exist
         supabase.from('books').select('available_copies').eq('id', bookId).single().then(({data}) => {
             if(data) {
                 supabase.from('books').update({ available_copies: data.available_copies + 1 }).eq('id', bookId)
             }
         })
     }
  })

  revalidatePath('/admin/approvals')
  revalidatePath('/')
  return { success: true }
}

export async function approveReturnRequest(recordId: string, bookId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'librarian', 'circulation_assistant'].includes(profile.role)) {
    return { error: 'Unauthorized role' }
  }

  // 1. Mark status as 'returned'
  const { error: updateError } = await supabase
    .from('borrowing_records')
    .update({ status: 'returned', returned_date: new Date().toISOString() })
    .eq('id', recordId)
    .eq('status', 'pending_return')

  if (updateError) {
    console.error('Return Approval Error:', updateError)
    return { error: 'Failed to approve return request' }
  }

  // 2. Increment available copies
  await supabase.rpc('increment_available_copies', { p_book_id: bookId }).then(res => {
     if(res.error) {
         supabase.from('books').select('available_copies').eq('id', bookId).single().then(({data}) => {
             if(data) {
                 supabase.from('books').update({ available_copies: data.available_copies + 1 }).eq('id', bookId)
             }
         })
     }
  })

  revalidatePath('/admin/approvals')
  revalidatePath('/')
  return { success: true }
}

export async function rejectReturnRequest(recordId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'librarian', 'circulation_assistant'].includes(profile.role)) {
    return { error: 'Unauthorized role' }
  }

  // Revert status to 'borrowed' or 'overdue' depending on date
  // For simplicity, we just set it back to 'borrowed' here; it will show as overdue if past due_date naturally.
  const { error: updateError } = await supabase
    .from('borrowing_records')
    .update({ status: 'borrowed' })
    .eq('id', recordId)
    .eq('status', 'pending_return')

  if (updateError) {
    console.error('Return Rejection Error:', updateError)
    return { error: 'Failed to reject return request' }
  }

  revalidatePath('/admin/approvals')
  revalidatePath('/')
  return { success: true }
}

