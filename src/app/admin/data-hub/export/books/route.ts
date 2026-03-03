import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']

export async function GET() {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !STAFF_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: books, error } = await supabase
    .from('books')
    .select('id, title, author, isbn, ddc_call_number, publisher, publication_year, total_copies, available_copies, shelf_location, category, genre, language, page_count, description')
    .order('title', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const headers = ['id', 'title', 'author', 'isbn', 'ddc_call_number', 'publisher', 'publication_year', 'total_copies', 'available_copies', 'shelf_location', 'category', 'genre', 'language', 'page_count', 'description']

  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    // Quote fields that contain commas, quotes, or newlines
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = (books ?? []).map(book =>
    headers.map(h => escape(book[h as keyof typeof book])).join(',')
  )

  const csv = [headers.join(','), ...rows].join('\n')
  const date = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="books_export_${date}.csv"`,
    },
  })
}
