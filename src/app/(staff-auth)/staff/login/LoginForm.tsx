'use client';

import React, { useState, useTransition } from 'react';
import { loginAction, type LoginActionResult } from '@/lib/auth/actions';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, AlertCircle } from 'lucide-react';

interface LoginFormProps {
  redirectTo?: string;
}

export default function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, setState] = useState<LoginActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await loginAction(state, formData);
        if (result) {
          setState(result);
        }
      } catch (err: unknown) {
        // Next.js redirect() throws a NEXT_REDIRECT digest error which must bubble up
        if (
          err &&
          typeof err === 'object' &&
          'message' in err &&
          (err as { message: string }).message === 'NEXT_REDIRECT'
        ) {
          throw err;
        }
        setState({
          success: false,
          error: 'An unexpected authentication error occurred. Please try again.',
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Top-Level Error Alert Banner */}
      {state?.error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg bg-red-950/80 border border-red-500/40 p-4 text-red-200"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-red-100">Authentication Failed</p>
              <p className="mt-1 leading-relaxed text-red-300">{state.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Preserved Redirect */}
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

      {/* Email Input */}
      <div>
        <label
          htmlFor="staff-email"
          className="block text-xs font-semibold text-slate-200 mb-1.5"
        >
          Work Email Address
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Mail className="w-4 h-4" />
          </div>
          <input
            id="staff-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isPending}
            placeholder="staff@santhaya.com"
            aria-invalid={Boolean(state?.fieldErrors?.email)}
            aria-describedby={state?.fieldErrors?.email ? 'staff-email-error' : undefined}
            className={`w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-slate-900 border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
              state?.fieldErrors?.email
                ? 'border-red-500/80 focus:ring-red-500/30'
                : 'border-slate-700 focus:border-gold-500 focus:ring-gold-500/20'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          />
        </div>
        {state?.fieldErrors?.email && (
          <p id="staff-email-error" className="mt-1.5 text-xs text-red-400">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      {/* Password Input with Visibility Toggle */}
      <div>
        <label
          htmlFor="staff-password"
          className="block text-xs font-semibold text-slate-200 mb-1.5"
        >
          Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="staff-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            disabled={isPending}
            placeholder="••••••••••••"
            aria-invalid={Boolean(state?.fieldErrors?.password)}
            aria-describedby={state?.fieldErrors?.password ? 'staff-password-error' : undefined}
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
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded p-1"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {state?.fieldErrors?.password && (
          <p id="staff-password-error" className="mt-1.5 text-xs text-red-400">
            {state.fieldErrors.password}
          </p>
        )}
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
              <span>Verifying Credentials...</span>
            </>
          ) : (
            <>
              <span>Sign In to Staff Portal</span>
              <ArrowRight className="w-4 h-4 text-navy-950" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

