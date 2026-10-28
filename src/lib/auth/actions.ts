'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { sanitizeStaffRedirect } from '@/lib/auth/redirect';
import { headers } from 'next/headers';
import crypto from 'node:crypto';
import { redirect } from 'next/navigation';

export interface LoginActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
  };
}

/**
 * Server-side Staff Login Action
 * Enforces:
 * 1. Sanitized input validation
 * 2. Persistent token-bucket rate limiting against brute force
 * 3. Supabase Auth credential verification
 * 4. Dual-barrier active staff profile validation
 * 5. Immediate session revocation if profile is absent or inactive
 * 6. Open-redirect protected navigation to internal staff destination
 */
export async function loginAction(
  prevState: LoginActionResult | null,
  formData: FormData
): Promise<LoginActionResult> {
  const emailRaw = formData.get('email');
  const passwordRaw = formData.get('password');
  const redirectToRaw = formData.get('redirectTo');

  const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
  const password = typeof passwordRaw === 'string' ? passwordRaw : '';
  const targetDestination = sanitizeStaffRedirect(
    typeof redirectToRaw === 'string' ? redirectToRaw : null
  );

  const fieldErrors: { email?: string; password?: string } = {};

  if (!email) {
    fieldErrors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = 'Please enter a valid email address.';
  }

  if (!password) {
    fieldErrors.password = 'Password is required.';
  } else if (password.length < 6) {
    fieldErrors.password = 'Password must be at least 6 characters.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  // Rate Limiting — Abuse & Brute-Force Throttling
  const headerStore = headers();
  const rawIp =
    headerStore.get('x-real-ip') ||
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1';

  const { rateLimitSalt, isServerConfigured } = getSupabaseEnv();

  const ipHash = crypto
    .createHmac('sha256', rateLimitSalt)
    .update(rawIp)
    .digest('hex')
    .slice(0, 32);

  const emailHash = crypto
    .createHmac('sha256', rateLimitSalt)
    .update(email)
    .digest('hex')
    .slice(0, 32);

  if (isServerConfigured) {
    try {
      const adminClient = createAdminClient();

      // Check IP rate limit (max 5 attempts per 5 minutes)
      const { data: rlIp } = await adminClient.rpc('check_rate_limit', {
        p_key: `login_ip:${ipHash}`,
        p_max_tokens: 5,
        p_refill_seconds: 300,
        p_cost: 1,
      });

      if (rlIp && rlIp.length > 0 && !rlIp[0].allowed) {
        const retryAfter = Math.ceil(rlIp[0].retry_after / 60) || 5;
        return {
          success: false,
          error: `Too many login attempts. Please wait ${retryAfter} minute(s) before trying again.`,
        };
      }

      // Check Account rate limit (max 5 attempts per 5 minutes)
      const { data: rlAcct } = await adminClient.rpc('check_rate_limit', {
        p_key: `login_acct:${emailHash}`,
        p_max_tokens: 5,
        p_refill_seconds: 300,
        p_cost: 1,
      });

      if (rlAcct && rlAcct.length > 0 && !rlAcct[0].allowed) {
        const retryAfter = Math.ceil(rlAcct[0].retry_after / 60) || 5;
        return {
          success: false,
          error: `Too many failed login attempts for this account. Please wait ${retryAfter} minute(s) before trying again.`,
        };
      }
    } catch {
      // Non-blocking fallback if rate-limiting table is momentarily unavailable
    }
  }

  // Supabase Auth Credential Authentication
  const supabase = createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return {
      success: false,
      error: 'Invalid email or password.',
    };
  }

  // Dual-Barrier Authorization Verification
  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    // Revoke established session immediately
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'Access denied: Your account is not authorized as a Santhaya Associates staff member.',
    };
  }

  if (!profile.is_active) {
    // Revoke established session immediately
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'Account inactive: Your staff access has been deactivated. Please contact the administrator.',
    };
  }

  // Redirect to validated destination (outside any try/catch)
  redirect(targetDestination);
}

/**
 * Server-side Staff Logout Action
 * Revokes active Supabase Auth session and cookies, then redirects to /staff/login.
 */
export async function logoutAction() {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/staff/login');
}

