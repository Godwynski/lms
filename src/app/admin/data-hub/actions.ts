'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']

export type ImportBookRow = {
  title: string
  author?: string
  isbn?: string
  ddc_call_number?: string
  publisher?: string
  publication_year?: number | null
  total_copies?: number
  shelf_location?: string
  category?: string
  genre?: string
  language?: string
  page_count?: number | null
  description?: string
}

export async function importBooks(rows: ImportBookRow[]): Promise<{ imported: number; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { imported: 0, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !STAFF_ROLES.includes(profile.role)) return { imported: 0, error: 'Unauthorized' }

  if (!rows.length) return { imported: 0, error: 'No rows to import.' }

  // Sanitise rows — remove empty keys, coerce numeric fields
  const clean = rows
    .filter(r => r.title?.trim())
    .map(r => ({
      title: r.title.trim(),
      author: r.author?.trim() || null,
      isbn: r.isbn?.trim() || null,
      ddc_call_number: r.ddc_call_number?.trim() || null,
      publisher: r.publisher?.trim() || null,
      publication_year: r.publication_year ? Number(r.publication_year) : null,
      total_copies: r.total_copies ? Number(r.total_copies) : 1,
      available_copies: r.total_copies ? Number(r.total_copies) : 1,
      shelf_location: r.shelf_location?.trim() || null,
      category: r.category?.trim() || null,
      genre: r.genre?.trim() || null,
      language: r.language?.trim() || null,
      page_count: r.page_count ? Number(r.page_count) : null,
      description: r.description?.trim() || null,
    }))

  if (!clean.length) return { imported: 0, error: 'No valid rows found (ensure "title" column is present).' }

  // Upsert on ISBN if provided, otherwise insert fresh rows
  const withIsbn = clean.filter(r => r.isbn)
  const withoutIsbn = clean.filter(r => !r.isbn)

  let totalImported = 0

  if (withIsbn.length) {
    const { error, count } = await supabase
      .from('books')
      .upsert(withIsbn, { onConflict: 'isbn', ignoreDuplicates: false, count: 'exact' })
    if (error) return { imported: 0, error: error.message }
    totalImported += count ?? withIsbn.length
  }

  if (withoutIsbn.length) {
    const { error, count } = await supabase
      .from('books')
      .insert(withoutIsbn, { count: 'exact' })
    if (error) return { imported: 0, error: error.message }
    totalImported += count ?? withoutIsbn.length
  }

  revalidatePath('/catalog')
  revalidatePath('/admin/books')
  revalidatePath('/admin/data-hub')

  return { imported: totalImported }
}
