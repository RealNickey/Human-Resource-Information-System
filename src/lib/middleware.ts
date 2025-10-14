import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { UserRole } from './types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
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

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const pathname = request.nextUrl.pathname

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in and trying to access auth/login pages, redirect to appropriate dashboard
  if (user && (pathname.startsWith('/auth') || pathname === '/')) {
    const userRole = user.user_metadata?.role as UserRole | undefined
    const url = request.nextUrl.clone()
    
    // Redirect based on user role
    switch (userRole) {
      case 'manager':
        url.pathname = '/manager/dashboard'
        break
      case 'employee':
        url.pathname = '/employee/dashboard'
        break
      default:
        url.pathname = '/protected'
        break
    }
    return NextResponse.redirect(url)
  }

  // Role-based access control
  if (user) {
    const userRole = user.user_metadata?.role as UserRole | undefined

    // Check if accessing role-specific routes
    if (pathname.startsWith('/manager') && userRole !== 'manager') {
      const url = request.nextUrl.clone()
      url.pathname = '/protected'
      return NextResponse.redirect(url)
    }

    if (
      pathname.startsWith('/employee') &&
      !(userRole && ['manager', 'employee'].includes(userRole))
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/protected'
      return NextResponse.redirect(url)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
