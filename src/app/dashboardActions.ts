'use server'

import { getSession } from '@/lib/auth/couchdb'
import { revalidatePath } from 'next/cache'
import PouchDB from 'pouchdb'

const COUCHDB_URL = process.env.NEXT_PUBLIC_COUCHDB_URL || 'http://localhost:5984'
async function getDb() {
  return new PouchDB(`${COUCHDB_URL}/lms`, { skip_setup: true })
}

export async function requestReturn(borrowingRecordId: string) {
  const session = await getSession()
  const userId = session?.userCtx?.name
  if (!userId) return { error: 'Unauthorized' }

  try {
    const db = await getDb()
    const rawRecord = await db.get(borrowingRecordId)
    const record = rawRecord as unknown as Record<string, unknown>
    
    // Authorization and status check
    if (record.borrower_id !== userId) return { error: 'Unauthorized' }
    if (!['borrowed', 'overdue'].includes(String(record.status))) return { error: 'Invalid status for return' }

    await db.put({
      ...record,
      status: 'pending_return',
      updated_at: new Date().toISOString()
    })

    revalidatePath('/')
    revalidatePath('/borrowings')
    return { success: true }
  } catch (error: unknown) {
    console.error('Failed to request return:', error)
    return { error: 'Failed to request return.' }
  }
}
