/**
 * Santhaya Associates — Staff Authentication Callback Handler
 * File: src/app/(staff-auth)/staff/auth/callback/route.ts
 *
 * Exchanges authentication codes / token hashes (PKCE and OTP)
 * for Supabase Auth recovery and invitation sessions.
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
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') || '/staff/reset-password';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const appUrl = getAppUrl();

  // If Supabase returned an explicit error (e.g. link expired)
  if (error) {
    console.warn('[Staff Auth Callback] Supabase Auth redirected with error:', {
      error,
      errorDescription,
    });
    return NextResponse.redirect(`${appUrl}/staff/forgot-password?error=expired`);
  }

  // Fallback if neither code nor token_hash is present
  if (!code && !tokenHash) {
    return NextResponse.redirect(`${appUrl}/staff/forgot-password?error=invalid_link`);
  }

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
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error('[Staff Auth Callback] Code exchange failed:', exchangeError.message);
        return NextResponse.redirect(`${appUrl}/staff/forgot-password?error=expired`);
      }
    } else if (tokenHash && type) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (verifyError) {
        console.error('[Staff Auth Callback] Token hash verification failed:', verifyError.message);
        return NextResponse.redirect(`${appUrl}/staff/forgot-password?error=expired`);
      }
    }

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown callback error';
    console.error('[Staff Auth Callback] Unhandled exception:', message);
    return NextResponse.redirect(`${appUrl}/staff/forgot-password?error=unexpected`);
  }
}
