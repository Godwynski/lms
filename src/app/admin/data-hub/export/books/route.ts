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

  type PouchBook = Record<string, unknown> & { _id: string }
  let books: PouchBook[] = []
  try {
    const res = await db.find({ selector: { type: 'book' } })
    books = res.docs as unknown as PouchBook[]
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Map CouchDB _id to standard id if needed
  books = books.map(b => ({ ...b, id: b._id }))

  const headers = ['id', 'title', 'author', 'isbn', 'ddc_call_number', 'publisher', 'publication_year', 'total_copies', 'available_copies', 'shelf_location', 'category', 'genre', 'language', 'page_count', 'description']

  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = books.map(book =>
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
