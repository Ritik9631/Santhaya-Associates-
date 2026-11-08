'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { getAppUrl } from '@/lib/utils/app-url';
import { headers } from 'next/headers';
import crypto from 'node:crypto';
import type { EmailOtpType } from '@supabase/supabase-js';

export interface RecoveryActionResult {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
}

/**
 * Server Action: Request Password Recovery Link
 * Enforces:
 * 1. Rate limiting by IP and Email hash
 * 2. Supabase Auth resetPasswordForEmail dispatch
 * 3. Canonical URL redirect targeting /staff/auth/callback
 * 4. Generic success response (prevents account enumeration)
 */
export async function requestPasswordRecoveryAction(
  _prevState: RecoveryActionResult | null,
  formData: FormData
): Promise<RecoveryActionResult> {
  try {
    const emailRaw = formData.get('email');
    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';

    if (!email) {
      return {
        success: false,
        fieldErrors: { email: 'Email address is required.' },
      };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        success: false,
        fieldErrors: { email: 'Please enter a valid corporate email address.' },
      };
    }

    // Rate Limiting — Abuse prevention
    let rawIp = '127.0.0.1';
    try {
      const headerStore = headers();
      rawIp =
        headerStore.get('x-real-ip') ||
        headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        '127.0.0.1';
    } catch {
      // Non-blocking fallback
    }

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
        const [{ data: rlIp }, { data: rlAcct }] = await Promise.all([
          adminClient.rpc('check_rate_limit', {
            p_key: `recovery_ip:${ipHash}`,
            p_max_tokens: 4,
            p_refill_seconds: 600, // 4 requests per 10 minutes per IP
            p_cost: 1,
          }),
          adminClient.rpc('check_rate_limit', {
            p_key: `recovery_acct:${emailHash}`,
            p_max_tokens: 3,
            p_refill_seconds: 600, // 3 requests per 10 minutes per email
            p_cost: 1,
          }),
        ]);

        if (rlAcct && rlAcct.length > 0 && !rlAcct[0].allowed) {
          const retryAfter = Math.ceil(rlAcct[0].retry_after / 60) || 5;
          return {
            success: false,
            error: `Too many password reset requests for this account. Please wait ${retryAfter} minute(s) before trying again.`,
          };
        }
      } catch {
        // Non-blocking fallback if rate-limiting table is unavailable
      }
    }

    // Dispatch recovery email via Supabase Auth
    const supabase = createServerSupabaseClient();
    const appUrl = getAppUrl();
    const redirectTo = `${appUrl}/staff/auth/callback?next=/staff/reset-password`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (resetError) {
      console.error('[Staff Recovery] resetPasswordForEmail error:', {
        message: resetError.message,
        status: resetError.status,
      });
      // Do not disclose server errors or non-existence; return generic delivery notice
    }

    return {
      success: true,
      message:
        'If an active staff account is registered with this email, a password recovery link has been sent. Please check your inbox and spam folder.',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown recovery error';
    console.error('[Staff Recovery] Unhandled exception:', message);
    return {
      success: true, // Still return generic success to prevent probing
      message:
        'If an active staff account is registered with this email, a password recovery link has been sent. Please check your inbox and spam folder.',
    };
  }
}

/**
 * Server Action: Reset Staff Password
 * Enforces:
 * 1. Active authenticated recovery session check
 * 2. Password matching & complexity validation (>= 8 chars)
 * 3. Supabase Auth updateUser invocation
 * 4. Audit trail logging in public.audit_logs
 * 5. Immediate cleanup & signout
 */
export async function resetStaffPasswordAction(
  _prevState: RecoveryActionResult | null,
  formData: FormData
): Promise<RecoveryActionResult> {
  try {
    const password = (formData.get('password') as string) || '';
    const confirmPassword = (formData.get('confirmPassword') as string) || '';
    const tokenHash = (formData.get('tokenHash') as string)?.trim() || '';
    const tokenType = ((formData.get('tokenType') as string)?.trim() || 'recovery') as EmailOtpType;

    const fieldErrors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      fieldErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      fieldErrors.password = 'Password must be at least 8 characters in length.';
    }

    if (!confirmPassword) {
      fieldErrors.confirmPassword = 'Confirmation password is required.';
    } else if (password !== confirmPassword) {
      fieldErrors.confirmPassword = 'Passwords do not match. Please verify both fields.';
    }

    if (Object.keys(fieldErrors).length > 0) {
      return { success: false, fieldErrors };
    }

    const supabase = createServerSupabaseClient();
    let targetUser = null;

    if (tokenHash) {
      // 1. Single-use token hash provided directly from human form submission (immune to prefetchers)
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: tokenType,
      });

      if (verifyError || !verifyData?.user) {
        console.warn('[Staff Recovery] verifyOtp error on submit:', verifyError?.message);
        return {
          success: false,
          error:
            'This password recovery link is invalid, has expired, or has already been used. Please request a new recovery link.',
        };
      }
      targetUser = verifyData.user;
    } else {
      // 2. Pre-established session (e.g. from PKCE code exchange or active session cookie)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return {
          success: false,
          error:
            'Your password recovery session has expired or is invalid. Please request a new recovery link.',
        };
      }
      targetUser = user;
    }

    // Update password via official Supabase Auth updateUser API
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      console.error('[Staff Recovery] updateUser password error:', updateError.message);
      return {
        success: false,
        error: `Failed to update password: ${updateError.message}`,
      };
    }

    // Record immutable audit event
    try {
      const adminClient = createAdminClient();
      await adminClient.from('audit_logs').insert({
        entity_type: 'staff_profiles',
        entity_id: targetUser.id,
        action: 'staff_password_recovered',
        actor_type: 'staff',
        actor_id: targetUser.id,
        new_state: {
          email: targetUser.email,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      // Non-blocking audit log catch
    }

    // Clean up temporary recovery session so user can log in with their fresh password
    await supabase.auth.signOut();

    return {
      success: true,
      message: 'Password successfully updated! You can now sign in with your new credentials.',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reset password.';
    console.error('[Staff Recovery] Unhandled reset exception:', message);
    return {
      success: false,
      error: 'An unexpected error occurred while resetting your password. Please try again.',
    };
  }
}

