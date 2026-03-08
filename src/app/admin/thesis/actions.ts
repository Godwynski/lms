'use server'

import { getSession, getAdminDb } from '@/lib/auth/couchdb'
import { revalidatePath } from 'next/cache'


const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']

async function verifyStaff() {
  const session = await getSession()
  const userId = session?.userCtx?.name
  if (!userId) return { error: 'Unauthorized', db: null }

  const roles = session?.userCtx?.roles || []
  let hasAccess = STAFF_ROLES.some(r => roles.includes(r))
  
  const db = await getAdminDb()

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
  
  if (!hasAccess) return { error: 'Unauthorized', db: null }
  return { error: null, db }
}

export async function createThesis(formData: FormData) {
  const { error, db } = await verifyStaff()
  if (error || !db) return { error }

  const _id = `thesis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const payload = {
    _id,
    type: 'thesis',
    title: formData.get('title') as string,
    author: formData.get('author') as string,
    course: formData.get('course') as string || null,
    publication_year: formData.get('publication_year') ? Number(formData.get('publication_year')) : null,
    abstract: formData.get('abstract') as string || null,
    pdf_url: formData.get('pdf_url') as string || null,
    created_at: new Date().toISOString()
  }

  if (!payload.title || !payload.author) return { error: 'Title and Author are required.' }

  try {
    await db.put(payload)
  } catch(e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { error: msg }
  }

  revalidatePath('/thesis')
  revalidatePath('/admin/thesis')
  return { success: true }
}

export async function updateThesis(id: string, formData: FormData) {
  const { error, db } = await verifyStaff()
  if (error || !db) return { error }

  const updates = {
    title: formData.get('title') as string,
    author: formData.get('author') as string,
    course: formData.get('course') as string || null,
    publication_year: formData.get('publication_year') ? Number(formData.get('publication_year')) : null,
    abstract: formData.get('abstract') as string || null,
    pdf_url: formData.get('pdf_url') as string || null,
  }

  if (!updates.title || !updates.author) return { error: 'Title and Author are required.' }

  try {
    const existing = await db.get(id) as unknown as Record<string, unknown> & { _id: string; _rev: string }
    await db.put({
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { error: msg }
  }

  revalidatePath('/thesis')
  revalidatePath('/admin/thesis')
  return { success: true }
}

export async function deleteThesis(id: string) {
  const { error, db } = await verifyStaff()
  if (error || !db) return { error }

  try {
    const existing = await db.get(id) as unknown as Record<string, unknown> & { _id: string; _rev: string }
    await db.remove(existing._id, String(existing._rev))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { error: msg }
  }

  revalidatePath('/thesis')
  revalidatePath('/admin/thesis')
  return { success: true }
}
