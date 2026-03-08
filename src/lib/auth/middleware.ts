import { NextResponse, type NextRequest } from 'next/server'

const COUCHDB_URL = process.env.NEXT_PUBLIC_COUCHDB_URL || 'http://localhost:5984'

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request,
  })

  // Check for PouchDB AuthSession cookie
  const authCookie = request.cookies.get('AuthSession')
  
  let isAuthenticated = false;
  let role = 'borrower';

  if (authCookie) {
      try {
        const res = await fetch(`${COUCHDB_URL}/_session`, {
          headers: {
            'Cookie': `AuthSession=${authCookie.value}`
          },
          // Cache needs to be disabled since this is middleware
          cache: 'no-store'
        })
    
        if (res.ok) {
          const data = await res.json()
          if (data.userCtx && data.userCtx.name) {
             isAuthenticated = true;
             // Determine role. For now, assume any logged in user without 'admin' is borrower.
             // If user has '_admin' role or 'staff' role, we parse it.
             if (data.userCtx.roles.includes('_admin') || data.userCtx.roles.includes('staff')) {
                 role = 'super_admin'; // or librarian
             } else if (data.userCtx.roles.includes('circulation_assistant')) {
                 role = 'circulation_assistant';
             }
          }
        }
      } catch (err) {
        console.error('Failed to get CouchDB session in middleware', err)
      }
  }

  const path = request.nextUrl.pathname;

  // 1. Unauthenticated users trying to access protected routes
  if (
    !isAuthenticated &&
    !path.startsWith('/login') &&
    !path.startsWith('/register') &&
    !path.startsWith('/auth') &&
    path !== '/'
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Role-Based Access Control for /admin routes
  if (isAuthenticated && path.startsWith('/admin')) {
    // Block standard borrowers from ANY admin route
    if (role === 'borrower') {
      return NextResponse.redirect(new URL('/catalog', request.url))
    }

    // Circulation Assistants can ONLY access /admin/checkout and /admin/users
    if (role === 'circulation_assistant' && !path.startsWith('/admin/checkout') && !path.startsWith('/admin/users')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}
