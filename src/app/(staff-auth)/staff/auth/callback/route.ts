/**
 * Santhaya Associates — Staff Authentication Callback Handler
 * File: src/app/(staff-auth)/staff/auth/callback/route.ts
 *
 * Handles:
 * 1. Explicit error redirects from Supabase Auth (e.g. otp_expired)
 * 2. PKCE authorization code exchange (code -> session)
 * 3. Token hash forwarding to /staff/reset-password (preserves tokens from prefetchers)
 * 4. Client-side hash bridge for implicit grant redirects (#access_token=...)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { getAppUrl } from '@/lib/utils/app-url';
import type { EmailOtpType } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = (searchParams.get('type') as EmailOtpType | null) || 'recovery';
  const next = searchParams.get('next') || '/staff/reset-password';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const appUrl = getAppUrl();

  // 1. Explicit Supabase Auth error (e.g. otp_expired)
  if (error) {
    console.warn('[Staff Auth Callback] Supabase Auth redirected with error:', {
      error,
      errorDescription,
    });
    return NextResponse.redirect(`${appUrl}/staff/forgot-password?error=expired`);
  }

  // 2. Token hash present: forward directly to /staff/reset-password without consuming on GET.
  // This completely immunizes the token against email scanner prefetching.
  if (tokenHash) {
    const targetUrl = new URL(`${appUrl}/staff/reset-password`);
    targetUrl.searchParams.set('token_hash', tokenHash);
    targetUrl.searchParams.set('type', type);
    return NextResponse.redirect(targetUrl.toString());
  }

  // 3. PKCE authorization code: exchange server-side for session cookies
  if (code) {
    let redirectUrl = `${appUrl}${next.startsWith('/') ? next : `/${next}`}`;
    let response = NextResponse.redirect(redirectUrl);

    const { url, anonKey } = getSupabaseEnv();

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.redirect(redirectUrl);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error('[Staff Auth Callback] Code exchange failed:', exchangeError.message);
        return NextResponse.redirect(`${appUrl}/staff/forgot-password?error=expired`);
      }
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown exchange error';
      console.error('[Staff Auth Callback] Code exchange exception:', message);
      return NextResponse.redirect(`${appUrl}/staff/forgot-password?error=unexpected`);
    }
  }

  // 4. Neither code nor token_hash in searchParams:
  // Could be an implicit grant redirect where tokens/errors are in window.location.hash.
  // Return an immediate HTML client bridge to capture and forward hash fragments without losing them.
  const clientBridgeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Santhaya Associates — Verifying Session</title>
  <script>
    (function() {
      try {
        var hash = window.location.hash;
        if (hash) {
          if (hash.indexOf('access_token=') !== -1) {
            window.location.replace('${appUrl}/staff/reset-password' + hash);
            return;
          }
          if (hash.indexOf('error=') !== -1 || hash.indexOf('otp_expired') !== -1) {
            window.location.replace('${appUrl}/staff/forgot-password?error=expired');
            return;
          }
        }
      } catch (e) {}
      window.location.replace('${appUrl}/staff/forgot-password?error=invalid_link');
    })();
  </script>
</head>
<body style="background:#020617;color:#94a3b8;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <p style="font-size:14px;letter-spacing:0.5px;">Verifying secure recovery link...</p>
</body>
</html>`;

  return new NextResponse(clientBridgeHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
