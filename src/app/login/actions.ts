'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

const COUCHDB_URL = process.env.NEXT_PUBLIC_COUCHDB_URL || 'http://localhost:5984'

export async function login(formData: FormData) {
  const data = {
    name: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  try {
    const res = await fetch(`${COUCHDB_URL}/_session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!res.ok) {
      redirect('/login?error=Could not authenticate user')
    }

    // Extract the AuthSession cookie from CouchDB response and set it in Next.js
    const setCookieHeader = res.headers.get('set-cookie')
    if (setCookieHeader) {
      // Basic parse to get AuthSession value
      const match = setCookieHeader.match(/AuthSession=([^;]+)/)
      if (match) {
        const cookieStore = await cookies()
        cookieStore.set('AuthSession', match[1], {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/'
        })
      }
    }
  } catch (err) {
    redirect('/login?error=Could not connect to database')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const data = {
    name: formData.get('email') as string,
    password: formData.get('password') as string,
    roles: ['borrower'],
    type: 'user',
    full_name: (formData.get('email') as string).split('@')[0]
  }
  
  try {
    // CouchDB user docs have ID prefix org.couchdb.user:
    const userId = `org.couchdb.user:${data.name}`
    
    // To create a user, we normally need admin credentials unless we configure CouchDB otherwise.
    // Assuming CouchDB is configured to allow creating users (or assuming admin creds are provided if needed):
    const res = await fetch(`${COUCHDB_URL}/_users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // In reality, might need Authorization: Basic base64(admin:pass) depending on CouchDB config
        // This is a minimal implementation assuming it's allowed or we add admin creds later
      },
      body: JSON.stringify(data)
    })

    if (!res.ok) {
      const errorData = await res.json()
      redirect(`/register?error=${encodeURIComponent(errorData.reason || 'Failed to register')}`)
    }

    // Immediately log them in
    await login(formData)

  } catch (err) {
    redirect(`/register?error=Could not connect to database`)
  }
}
