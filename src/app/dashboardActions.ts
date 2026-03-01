'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function requestReturn(borrowingRecordId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('borrowing_records')
    .update({ status: 'pending_return' })
    .eq('id', borrowingRecordId)
    .eq('borrower_id', user.id)
    .in('status', ['borrowed', 'overdue'])

  if (error) {
    console.error('Failed to request return:', error)
    return { error: 'Failed to request return.' }
  }

  revalidatePath('/')
  revalidatePath('/borrowings')
  return { success: true }
}
