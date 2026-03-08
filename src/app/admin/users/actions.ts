'use server'

import { getSession, getAdminDb, getAdminUsersDb } from '@/lib/auth/couchdb'
import { revalidatePath } from 'next/cache'
import { extractStudentNumberFromEmail } from '@/lib/email-utils'

const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']
type PouchDoc = Record<string, unknown> & { _id: string; _rev: string }

async function verifySuperAdminOrLibrarian() {
  const session = await getSession()
  const userId = session?.userCtx?.name
  if (!userId) return { error: 'Unauthorized' }

  const roles = session?.userCtx?.roles || []
  let hasAccess = ['super_admin', 'librarian'].some(r => roles.includes(r))
  
  const db = await getAdminDb()

  if (!hasAccess) {
    try {
      const profileDocs = await db.find({ selector: { type: 'profile', user_id: userId } })
      const firstDoc = profileDocs.docs[0] as unknown as PouchDoc
      if (profileDocs.docs.length > 0 && ['super_admin', 'librarian'].includes(String(firstDoc?.role ?? ''))) {
        hasAccess = true
      }
    } catch {
      // Non-critical: fall through
    }
  }
  
  if (!hasAccess) return { error: 'Unauthorized. Only administrators can perform this action.' }
  return { error: null, db, userId }
}

export async function adminCreateUser(formData: FormData) {
  const { error, db } = await verifySuperAdminOrLibrarian()
  if (error || !db) return { error }

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as string
  const fullName = formData.get('full_name') as string

  if (!email || !password || !role || !fullName) {
    return { error: 'All fields are required' }
  }

  const usersDb = await getAdminUsersDb()
  try {
    const existingUser = await usersDb.get(`org.couchdb.user:${email}`).catch(() => null)
    if (existingUser) return { error: 'A user with this email already exists.' }

    await usersDb.put({
      _id: `org.couchdb.user:${email}`,
      name: email,
      roles: [role],
      type: 'user',
      password: password
    })
  } catch (err: unknown) {
    console.error('Admin user creation failed:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return { error: msg }
  }

  const autoStudentNumber = role === 'borrower' ? extractStudentNumberFromEmail(email) : null
  
  try {
    await db.put({
      _id: `profile_${Date.now()}_${email}`,
      type: 'profile',
      user_id: email,
      email: email,
      full_name: fullName,
      role: role,
      student_number: autoStudentNumber || null,
      created_at: new Date().toISOString()
    })
  } catch (err: unknown) {
    console.error('Profile creation failed:', err)
  }

  revalidatePath('/admin/users')
  const msg = autoStudentNumber
    ? `Account created for ${fullName}. Student number auto-set to ${autoStudentNumber}.`
    : `Successfully created ${role} account for ${fullName}`
  return { success: true, message: msg }
}

export async function adminUpdateUserRole(targetUserId: string, newRole: string) {
  const { error, db, userId } = await verifySuperAdminOrLibrarian()
  if (error || !db) return { error }

  if (userId === targetUserId) {
    return { error: 'You cannot change your own role from this interface.' }
  }

  const usersDb = await getAdminUsersDb()
  try {
    const userDoc = await usersDb.get(`org.couchdb.user:${targetUserId}`) as unknown as PouchDoc
    await usersDb.put({ ...userDoc, roles: [newRole] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `Auth update failed: ${msg}` }
  }

  try {
    const profiles = await db.find({ selector: { type: 'profile', user_id: targetUserId } })
    if (profiles.docs.length > 0) {
      const profileDoc = profiles.docs[0] as unknown as PouchDoc
      await db.put({ ...profileDoc, role: newRole, updated_at: new Date().toISOString() })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `Database update failed: ${msg}` }
  }

  revalidatePath('/admin/users')
  return { success: true, message: `Role updated to ${newRole}` }
}

export async function adminDeleteUser(targetUserId: string) {
  const { error, db, userId } = await verifySuperAdminOrLibrarian()
  if (error || !db) return { error }

  if (userId === targetUserId) {
    return { error: 'You cannot delete your own account while logged in.' }
  }

  const usersDb = await getAdminUsersDb()
  try {
    const userDoc = await usersDb.get(`org.couchdb.user:${targetUserId}`) as unknown as PouchDoc
    await usersDb.remove(userDoc._id, userDoc._rev)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `Failed to delete auth user: ${msg}` }
  }

  try {
    const profiles = await db.find({ selector: { type: 'profile', user_id: targetUserId } })
    if (profiles.docs.length > 0) {
      for (const p of profiles.docs) {
        const doc = p as unknown as PouchDoc
        await db.remove(doc._id, doc._rev)
      }
    }
  } catch {
    // Non-critical: profile removal failure, auth user already deleted
  }

  revalidatePath('/admin/users')
  return { success: true, message: 'User permanently deleted.' }
}

export async function adminUpdateStudentNumber(targetUserId: string, studentNumber: string) {
  const { error, db } = await verifySuperAdminOrLibrarian()
  if (error || !db) return { error }

  const clean = studentNumber.trim()
  if (!clean) return { error: 'Student number cannot be empty.' }

  try {
    const existing = await db.find({ selector: { type: 'profile', student_number: clean } })
    const firstDoc = existing.docs[0] as unknown as PouchDoc
    if (existing.docs.length > 0 && firstDoc.user_id !== targetUserId) {
      return { error: 'That student number is already assigned to another account.' }
    }

    const profiles = await db.find({ selector: { type: 'profile', user_id: targetUserId } })
    if (profiles.docs.length > 0) {
      const profileDoc = profiles.docs[0] as unknown as PouchDoc
      await db.put({ ...profileDoc, student_number: clean, updated_at: new Date().toISOString() })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: msg }
  }

  revalidatePath('/admin/users')
  return { success: true, message: `Student number set to ${clean}` }
}

export async function getAllUsers() {
  const { error, db } = await verifySuperAdminOrLibrarian()
  if (error || !db) return { error, users: [] }

  try {
    const res = await db.find({ selector: { type: 'profile' }, limit: 500 })
    const users = (res.docs as unknown as PouchDoc[]).map(u => ({
      ...u,
      id: u._id,
    }))
    return { users, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: msg, users: [] }
  }
}

export async function verifyStaffRole() {
  const session = await getSession()
  const userId = session?.userCtx?.name
  if (!userId) return { error: 'Unauthorized' }

  const roles = session?.userCtx?.roles || []
  let hasAccess = STAFF_ROLES.some(r => roles.includes(r))
  
  const db = await getAdminDb()

  if (!hasAccess) {
    try {
      const profileDocs = await db.find({ selector: { type: 'profile', user_id: userId } })
      const firstDoc = profileDocs.docs[0] as unknown as PouchDoc
      if (profileDocs.docs.length > 0 && STAFF_ROLES.includes(String(firstDoc?.role ?? ''))) {
        hasAccess = true
      }
    } catch {
      // Non-critical: fall through
    }
  }

  if (!hasAccess) return { error: 'Unauthorized role' }
  return { db, userId }
}
