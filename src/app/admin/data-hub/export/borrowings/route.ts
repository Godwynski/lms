import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !STAFF_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: records, error } = await supabase
    .from('borrowing_records')
    .select('id, status, borrowed_date, due_date, books(title, isbn), profiles(full_name, email, student_number)')
    .in('status', ['borrowed', 'pending', 'overdue', 'pending_return'])
    .order('due_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const headers = ['record_id', 'borrower_name', 'borrower_email', 'student_number', 'book_title', 'isbn', 'status', 'borrowed_date', 'due_date']

  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (records ?? []).map((r: any) => [
    r.id,
    r.profiles?.full_name ?? '',
    r.profiles?.email ?? '',
    r.profiles?.student_number ?? '',
    r.books?.title ?? '',
    r.books?.isbn ?? '',
    r.status,
    r.borrowed_date,
    r.due_date,
  ].map(escape).join(','))

  const csv = [headers.join(','), ...rows].join('\n')
  const date = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="active_borrowings_${date}.csv"`,
    },
  })
}
