import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname;

  // 1. Unauthenticated users trying to access protected routes
  if (
    !user &&
    !path.startsWith('/login') &&
    !path.startsWith('/register') &&
    !path.startsWith('/auth') &&
    path !== '/'
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Role-Based Access Control for /admin routes
  if (user && path.startsWith('/admin')) {
    // Fetch user role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'borrower'

    // Block standard borrowers from ANY admin route
    if (role === 'borrower') {
      return NextResponse.redirect(new URL('/catalog', request.url))
    }

    // Circulation Assistants can ONLY access /admin/checkout and /admin/users
    if (role === 'circulation_assistant' && !path.startsWith('/admin/checkout') && !path.startsWith('/admin/users')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    // Librarians and Super Admins can access all currently built /admin routes.
    // As you build more sensitive routes (like Settings), you'd restrict them to 'super_admin' only here.
  }

  return supabaseResponse
}
