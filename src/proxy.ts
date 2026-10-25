import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Unauthenticated hitting app routes → login
  const protectedPrefixes = ['/app', '/reader', '/comics', '/habits', '/settings']
  if (!user && protectedPrefixes.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated hitting auth routes → app
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/app', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/app/:path*', '/reader/:path*', '/comics/:path*', '/habits/:path*', '/settings/:path*', '/login', '/signup'],
}
