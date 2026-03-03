'use server'

import { createClient } from '@/utils/supabase/server'

export type AuditBookResult = {
  id: string
  title: string
  author?: string | null
  isbn?: string | null
  shelf_location?: string | null
  available_copies: number
  total_copies: number
}

const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']

export async function getAllBooksForAudit(): Promise<AuditBookResult[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !STAFF_ROLES.includes(profile.role)) return []

  const { data } = await supabase
    .from('books')
    .select('id, title, author, isbn, shelf_location, available_copies, total_copies')
    .order('title', { ascending: true })

  return data ?? []
}

export async function lookupBookByISBN(isbn: string): Promise<AuditBookResult | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('books')
    .select('id, title, author, isbn, shelf_location, available_copies, total_copies')
    .eq('isbn', isbn)
    .maybeSingle()

  return data ?? null
}
