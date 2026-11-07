import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { KeyRound, AlertTriangle, ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ResetPasswordForm } from './ResetPasswordForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Set New Password | Santhaya Associates Staff ERP',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ResetPasswordPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isSessionValid = Boolean(user);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Lockup */}
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-white rounded-xl shadow-lg p-2.5 flex items-center justify-center border border-slate-700">
            <Image
              src="/santhaya-symbol.png"
              alt="Santhaya Associates Symbol"
              width={48}
              height={55}
              priority
              className="h-full w-auto object-contain"
            />
          </div>
        </div>

        {/* Header Titles */}
        <h2 className="text-center text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
          <KeyRound className="w-5 h-5 text-gold-500" />
          <span>{isSessionValid ? 'Set New Password' : 'Link Invalid or Expired'}</span>
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          {isSessionValid
            ? 'Enter and confirm your replacement password below to regain portal access.'
            : 'The password reset link is invalid, incomplete, or has expired.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          {isSessionValid ? (
            <ResetPasswordForm />
          ) : (
            <div className="text-center space-y-5">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  For your security, password reset links expire after a short period or after single use.
                  Please request a fresh reset link to continue.
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
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center text-[11px] text-slate-400">
          <p>Santhaya Associates Pvt. Ltd. &bull; Enterprise Resource Planning</p>
          <p className="mt-1 text-slate-500">
            Protected internal system. Password changes are cryptographically hashed and logged.
          </p>
        </div>
      </div>
    </div>
  );
}
