'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { requestPasswordRecoveryAction, type RecoveryActionResult } from '@/lib/auth/recovery-actions';
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Send } from 'lucide-react';

interface ForgotPasswordFormProps {
  initialError?: string;
}

export function ForgotPasswordForm({ initialError }: ForgotPasswordFormProps) {
  const [state, setState] = useState<RecoveryActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  let bannerError: string | null = null;
  if (initialError === 'expired') {
    bannerError = 'The password recovery link has expired or has already been used. Please request a new one.';
  } else if (initialError === 'invalid_link') {
    bannerError = 'The recovery link is invalid or incomplete. Please request a fresh reset link.';
  } else if (initialError === 'unexpected') {
    bannerError = 'An unexpected recovery session error occurred. Please try again.';
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await requestPasswordRecoveryAction(state, formData);
        setState(result);
      } catch (err: unknown) {
        setState({
          success: false,
          error: 'An unexpected network error occurred. Please try again.',
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Informational or Initial Error Banner */}
      {bannerError && !state?.message && (
        <div
          role="alert"
          className="rounded-lg bg-amber-950/80 border border-amber-500/40 p-4 text-amber-200"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-amber-100">Recovery Link Invalid</p>
              <p className="mt-1 leading-relaxed text-amber-300">{bannerError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Error Banner */}
      {state?.error && (
        <div
          role="alert"
          className="rounded-lg bg-red-950/80 border border-red-500/40 p-4 text-red-200"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-red-100">Request Failed</p>
              <p className="mt-1 leading-relaxed text-red-300">{state.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {state?.success && state.message ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Recovery Email Dispatched</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed max-w-sm mx-auto">
              {state.message}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/staff/login"
              className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Staff Sign In</span>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="recovery-email"
              className="block text-xs font-semibold text-slate-200 mb-1.5"
            >
              Registered Staff Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="recovery-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isPending}
                placeholder="staff@santhaya.com"
                aria-invalid={Boolean(state?.fieldErrors?.email)}
                aria-describedby={state?.fieldErrors?.email ? 'recovery-email-error' : undefined}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-slate-900 border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                  state?.fieldErrors?.email
                    ? 'border-red-500/80 focus:ring-red-500/30'
                    : 'border-slate-700 focus:border-gold-500 focus:ring-gold-500/20'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              />
            </div>
            {state?.fieldErrors?.email && (
              <p id="recovery-email-error" className="mt-1.5 text-xs text-red-400">
                {state.fieldErrors.email}
              </p>
            )}
            <p className="mt-2 text-[11px] text-slate-400 leading-normal">
              Enter your corporate email address to receive an official password reset link.
            </p>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gold-400/40"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-navy-950" />
                  <span>Dispatching Link...</span>
                </>
              ) : (
                <>
                  <span>Send Recovery Link</span>
                  <Send className="w-4 h-4 text-navy-950" />
                </>
              )}
            </button>
          </div>

          <div className="pt-2 text-center">
            <Link
              href="/staff/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Staff Sign In</span>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

