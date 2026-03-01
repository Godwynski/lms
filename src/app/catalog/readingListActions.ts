'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addToReadingList(bookId: string, listId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('reading_list_books')
    .insert({ list_id: listId, book_id: bookId })

  if (error) {
    if (error.code === '23505') return { error: 'Book is already in this list' }
    return { error: error.message }
  }

  revalidatePath('/catalog')
  revalidatePath('/reading-lists')
  return { success: true }
}

export async function removeFromReadingList(bookId: string, listId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('reading_list_books')
    .delete()
    .eq('list_id', listId)
    .eq('book_id', bookId)

  if (error) return { error: error.message }

  revalidatePath('/catalog')
  revalidatePath('/reading-lists')
  return { success: true }
}

export async function createReadingList(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('reading_lists')
    .insert({ user_id: user.id, name: name.trim() })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/catalog')
  revalidatePath('/reading-lists')
  return { success: true, list: data }
}

export async function deleteReadingList(listId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('reading_lists')
    .delete()
    .eq('id', listId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/reading-lists')
  return { success: true }
}
