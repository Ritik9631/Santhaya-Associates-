import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnv } from '@/lib/supabase/env';

/**
 * Santhaya Associates — Staff Route Protection Middleware
 * File: src/middleware.ts
 *
 * Intercepts all requests matching /staff/:path*.
 * Guarantees that:
 * 1. Public website routes are never intercepted by this matcher.
 * 2. /staff/login is accessible unauthenticated without redirect loops.
 * 3. Protected /staff/* routes require an authenticated Supabase Auth session.
 * 4. Deep authorization (active staff_profiles validation) is enforced in staff/layout.tsx.
 * 5. Strict anti-caching headers prevent back-button cache exposure after logout.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { pathname } = request.nextUrl;

  // Allow unauthenticated access to staff login to prevent redirect loops
  if (pathname === '/staff/login') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: '',
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: '',
          ...options,
        });
      },
    },
  });

  // Verify authenticated session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/staff/login';
    // Preserve target destination if deeper than /staff
    if (pathname !== '/staff') {
      redirectUrl.searchParams.set('redirectTo', pathname);
    }
    const redirectResponse = NextResponse.redirect(redirectUrl);
    redirectResponse.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    redirectResponse.headers.set('Pragma', 'no-cache');
    redirectResponse.headers.set('Expires', '0');
    return redirectResponse;
  }

  // Anti-cache and search engine exclusion headers for all protected staff pages
  response.headers.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate'
  );
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');

  return response;
}

export const config = {
  matcher: ['/staff/:path*'],
};
