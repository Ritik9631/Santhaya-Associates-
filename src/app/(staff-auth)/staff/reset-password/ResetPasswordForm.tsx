'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { resetStaffPasswordAction, type RecoveryActionResult } from '@/lib/auth/recovery-actions';
import { createClient } from '@/lib/supabase/client';
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

export interface ResetPasswordFormProps {
  initialTokenHash?: string | null;
  initialType?: string | null;
  initialHasUser?: boolean;
  initialError?: string | null;
}

export function ResetPasswordForm({
  initialTokenHash = null,
  initialType = 'recovery',
  initialHasUser = false,
  initialError = null,
}: ResetPasswordFormProps) {
  const [tokenHash, setTokenHash] = useState<string | null>(initialTokenHash);
  const [tokenType, setTokenType] = useState<string>(initialType || 'recovery');
  const [hasValidAuth, setHasValidAuth] = useState<boolean>(
    Boolean(initialTokenHash || initialHasUser)
  );
  const [checkingAuth, setCheckingAuth] = useState<boolean>(!initialTokenHash && !initialHasUser);
  const [authError, setAuthError] = useState<string | null>(
    initialError === 'expired'
      ? 'This password recovery link is invalid, has expired, or has already been used. Please request a new recovery link.'
      : null
  );

  const [state, setState] = useState<RecoveryActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Client-side authentication hydration (for hash fragments or URL parameters)
  useEffect(() => {
    // If we already know the session is valid from server, no client hydration needed
    if (initialTokenHash || initialHasUser) {
      setCheckingAuth(false);
      return;
    }

    const hydrateClientAuth = async () => {
      try {
        // 1. Check query parameters on client
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const qTokenHash = params.get('token_hash');
          const qType = params.get('type') || 'recovery';
          const qError = params.get('error');

          if (qTokenHash) {
            setTokenHash(qTokenHash);
            setTokenType(qType);
            setHasValidAuth(true);
            setCheckingAuth(false);
            return;
          }

          if (qError === 'expired' || qError === 'access_denied') {
            setAuthError(
              'This password recovery link has expired or has already been used. Please request a fresh recovery email below.'
            );
            setCheckingAuth(false);
            return;
          }

          // 2. Check hash fragments (e.g. from GoTrue implicit grant: #access_token=...)
          const hash = window.location.hash;
          if (hash) {
            const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const hashError = hashParams.get('error');
            const hashErrorCode = hashParams.get('error_code');

            if (hashError || hashErrorCode === 'otp_expired') {
              setAuthError(
                'This password recovery link is invalid or has expired. Please request a new reset link.'
              );
              setCheckingAuth(false);
              return;
            }

            if (accessToken && refreshToken) {
              const supabase = createClient();
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (!sessionError) {
                setHasValidAuth(true);
                setCheckingAuth(false);
                return;
              }
            }
          }

          // 3. Check existing browser session
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            setHasValidAuth(true);
            setCheckingAuth(false);
            return;
          }
        }
      } catch (err) {
        console.warn('[ResetPasswordForm] Client auth hydration error:', err);
      }

      setCheckingAuth(false);
    };

    hydrateClientAuth();
  }, [initialTokenHash, initialHasUser]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await resetStaffPasswordAction(state, formData);
        setState(result);
      } catch {
        setState({
          success: false,
          error: 'An unexpected error occurred during password update. Please try again.',
        });
      }
    });
  };

  // State A: Checking auth state on client
  if (checkingAuth) {
    return (
      <div className="py-8 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500 mx-auto" />
        <p className="text-xs text-slate-400">Verifying secure recovery credentials...</p>
      </div>
    );
  }

  // State B: Success state after password update
  if (state?.success && state.message) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Password Updated Successfully</h3>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed max-w-sm mx-auto">
            {state.message}
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/staff/login"
            className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 text-xs font-bold shadow-md transition-all"
          >
            <span>Sign In to Staff Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // State C: Invalid, expired, or missing recovery link
  if (!hasValidAuth) {
    return (
      <div className="text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white mb-2">Recovery Link Invalid or Expired</h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
            {authError ||
              'For your security, password recovery links are single-use and expire after 1 hour. Please request a fresh reset link to continue.'}
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/staff/forgot-password"
            className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 text-xs font-bold shadow-md transition-all"
          >
            <span>Request New Reset Link</span>
          </Link>
        </div>
        <div className="pt-1">
          <Link
            href="/staff/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>
    );
  }

  // State D: Valid session or token_hash ready for new password entry
  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Hidden single-use token parameters */}
      {tokenHash && <input type="hidden" name="tokenHash" value={tokenHash} />}
      {tokenType && <input type="hidden" name="tokenType" value={tokenType} />}

      {/* Top Alert Error */}
      {state?.error && (
        <div
          role="alert"
          className="rounded-lg bg-red-950/80 border border-red-500/40 p-4 text-red-200"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-red-100">Update Failed</p>
              <p className="mt-1 leading-relaxed text-red-300">{state.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* New Password */}
      <div>
        <label
          htmlFor="new-password"
          className="block text-xs font-semibold text-slate-200 mb-1.5"
        >
          New Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="new-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            disabled={isPending}
            placeholder="Minimum 8 characters"
            aria-invalid={Boolean(state?.fieldErrors?.password)}
            aria-describedby={state?.fieldErrors?.password ? 'password-error' : undefined}
            className={`w-full pl-10 pr-11 py-2.5 rounded-lg bg-slate-900 border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
              state?.fieldErrors?.password
                ? 'border-red-500/80 focus:ring-red-500/30'
                : 'border-slate-700 focus:border-gold-500 focus:ring-gold-500/20'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isPending}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none rounded p-1"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {state?.fieldErrors?.password && (
          <p id="password-error" className="mt-1.5 text-xs text-red-400">
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label
          htmlFor="confirm-password"
          className="block text-xs font-semibold text-slate-200 mb-1.5"
        >
          Confirm New Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="confirm-password"
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            required
            disabled={isPending}
            placeholder="Re-enter your new password"
            aria-invalid={Boolean(state?.fieldErrors?.confirmPassword)}
            aria-describedby={state?.fieldErrors?.confirmPassword ? 'confirm-password-error' : undefined}
            className={`w-full pl-10 pr-11 py-2.5 rounded-lg bg-slate-900 border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
              state?.fieldErrors?.confirmPassword
                ? 'border-red-500/80 focus:ring-red-500/30'
                : 'border-slate-700 focus:border-gold-500 focus:ring-gold-500/20'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            disabled={isPending}
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none rounded p-1"
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {state?.fieldErrors?.confirmPassword && (
          <p id="confirm-password-error" className="mt-1.5 text-xs text-red-400">
            {state.fieldErrors.confirmPassword}
          </p>
        )}
      </div>

      {/* Password Requirements Helper */}
      <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3 text-[11px] text-slate-400 space-y-1">
        <p className="font-semibold text-slate-300 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-gold-500" />
          <span>Security Requirements:</span>
        </p>
        <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
          <li>Must be at least 8 characters in length</li>
          <li>Use a combination of letters, numbers, and special symbols</li>
          <li>Never reuse your previous corporate ERP password</li>
        </ul>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gold-400/40"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-navy-950" />
              <span>Updating Password...</span>
            </>
          ) : (
            <>
              <span>Save New Password</span>
              <ArrowRight className="w-4 h-4 text-navy-950" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
