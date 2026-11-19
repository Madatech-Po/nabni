import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNextPath } from '@/utils/safeRedirect'

// Pages that need a signed-in user. /reset-password is deliberately not here: it shows its own
// "open the link from the email" message without a session, and the recovery link signs the user in.
export const PROTECTED_PREFIXES = [
  '/dashboard', '/parent', '/teacher', '/admin', '/requests/new', '/profile/edit', '/notifications',
];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || pathname.endsWith('/proposal');
}

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
        // Refreshed tokens go on the request (for this render) and on the response (for the browser),
        // with the no-cache headers @supabase/ssr asks for alongside them.
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
          Object.entries(headers ?? {}).forEach(([key, value]) => supabaseResponse.headers.set(key, value))
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname;
  
  if (isProtectedPath(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    // Only write internal paths: a request for "//evil.com/proposal" must not become ?redirectTo=//evil.com/...
    const back = safeNextPath(pathname, '');
    if (back) url.searchParams.set('redirectTo', back);
    return NextResponse.redirect(url);
  }

  // If user is logged in and tries to access login/register, redirect to dashboard or redirectTo param
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    // Resolve against this site so ?redirectTo=//evil.com or https://evil.com cannot leave it.
    const target = safeNextPath(request.nextUrl.searchParams.get('redirectTo'), '/dashboard');
    return NextResponse.redirect(new URL(target, request.nextUrl.origin));
  }

  return supabaseResponse
}
