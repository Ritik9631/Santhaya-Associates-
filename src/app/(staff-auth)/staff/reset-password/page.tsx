import React from 'react';
import Image from 'next/image';
import { KeyRound } from 'lucide-react';
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

interface ResetPasswordPageProps {
  searchParams: {
    token_hash?: string;
    type?: string;
    error?: string;
    error_code?: string;
    error_description?: string;
  };
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tokenHash = searchParams?.token_hash || null;
  const tokenType = searchParams?.type || 'recovery';
  const error = searchParams?.error || null;
  const hasUser = Boolean(user);

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
          <span>Set New Password</span>
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          Enter and confirm your replacement password below to regain portal access.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          <ResetPasswordForm
            initialTokenHash={tokenHash}
            initialType={tokenType}
            initialHasUser={hasUser}
            initialError={error}
          />
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
