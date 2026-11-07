'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { resetStaffPasswordAction, type RecoveryActionResult } from '@/lib/auth/recovery-actions';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export function ResetPasswordForm() {
  const [state, setState] = useState<RecoveryActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await resetStaffPasswordAction(state, formData);
        setState(result);
      } catch (err: unknown) {
        setState({
          success: false,
          error: 'An unexpected error occurred during password update. Please try again.',
        });
      }
    });
  };

  if (state?.success && state.message) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Password Updated</h3>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed max-w-sm mx-auto">
            {state.message}
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/staff/login"
            className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 text-xs font-bold shadow-md transition-all"
          >
            <span>Sign In with New Password</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
