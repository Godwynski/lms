import { cookies } from 'next/headers'

const COUCHDB_URL = process.env.NEXT_PUBLIC_COUCHDB_URL || 'http://localhost:5984'
const ADMIN_COUCHDB_URL = process.env.COUCHDB_URL || 'http://admin:password123@localhost:5984'

export async function getAdminDb() {
  const PouchDB = require('pouchdb').default || require('pouchdb')
  const PouchDBFind = require('pouchdb-find').default || require('pouchdb-find')
  PouchDB.plugin(PouchDBFind)
  return new PouchDB(`${ADMIN_COUCHDB_URL}/lms`, { skip_setup: true })
}

export async function getAdminUsersDb() {
  const PouchDB = require('pouchdb').default || require('pouchdb')
  return new PouchDB(`${ADMIN_COUCHDB_URL}/_users`, { skip_setup: true })
}

export async function getSession() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('AuthSession')

  if (!authCookie) {
    return { userCtx: null }
  }

  try {
    const res = await fetch(`${COUCHDB_URL}/_session`, {
      headers: {
        'Cookie': `AuthSession=${authCookie.value}`
      },
      next: { revalidate: 0 }
    })

    if (!res.ok) {
      return { userCtx: null }
    }

    const data = await res.json()
    return data
  } catch (err) {
    console.error('Failed to get CouchDB session', err)
    return { userCtx: null }
  }
}

export async function getUserRole(_username: string) {
  // We can store roles in the _users database document for the user
  // Document ID is org.couchdb.user:USERNAME
  try {
    // We would need admin credentials to read arbitrary users or have the user document be readable
    // For now, assume roles are in userCtx.roles
    // CouchDB user context returns roles: ["_admin", "staff", "borrower"] etc.
    return 'borrower'; // Placeholder until we fully set up users
  } catch (_err) {
    return 'borrower'
  }
}
