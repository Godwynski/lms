import { getSession, getAdminDb } from '@/lib/auth/couchdb'
import { NextResponse } from 'next/server'



const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']

export async function GET() {
  const session = await getSession()
  const userId = session?.userCtx?.name
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await getAdminDb()
  const roles = session?.userCtx?.roles || []
  let hasAccess = STAFF_ROLES.some(r => roles.includes(r))

  if (!hasAccess) {
    try {
      const profileDocs = await db.find({ selector: { type: 'profile', user_id: userId } })
      if (profileDocs.docs.length > 0 && STAFF_ROLES.includes(String((profileDocs.docs[0] as unknown as Record<string, unknown>)?.role ?? ''))) {
        hasAccess = true
      }
    } catch {
      // Non-critical: fall through
    }
  }

  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  type PouchDoc = Record<string, unknown> & { _id: string }
  type EnrichedRecord = PouchDoc & { books: PouchDoc | null; profiles: PouchDoc | null }
  let records: EnrichedRecord[] = []
  try {
    const res = await db.find({ 
        selector: { 
            type: 'borrowing_record', 
            status: { $in: ['borrowed', 'pending', 'overdue', 'pending_return'] } 
        } 
    })
    const rawRecords = res.docs as unknown as PouchDoc[]

    const [allBooksRes, allProfilesRes] = await Promise.all([
        db.find({ selector: { type: 'book' } }),
        db.find({ selector: { type: 'profile' } })
    ])
    
    const booksMap = new Map((allBooksRes.docs as unknown as PouchDoc[]).map(b => [b._id, b]))
    const profilesMap = new Map((allProfilesRes.docs as unknown as PouchDoc[]).map(p => [String(p.user_id ?? ''), p]))

    records = rawRecords.map(r => ({
        ...r,
        id: r._id,
        books: booksMap.get(String(r.book_id ?? '')) ?? null,
        profiles: profilesMap.get(String(r.borrower_id ?? '')) ?? null
    }))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const headers = ['record_id', 'borrower_name', 'borrower_email', 'student_number', 'book_title', 'isbn', 'status', 'borrowed_date', 'due_date']

  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = records.map((r) => [
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
