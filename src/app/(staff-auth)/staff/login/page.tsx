import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import LoginForm from './LoginForm';

interface StaffLoginPageProps {
  searchParams: {
    error?: string;
    redirectTo?: string;
  };
}

export const metadata = {
  title: 'Staff Portal Sign In | Santhaya Associates Pvt. Ltd.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function StaffLoginPage({ searchParams }: StaffLoginPageProps) {
  const { error, redirectTo } = searchParams;

  let errorMessage: { title: string; detail: string } | null = null;

  if (error === 'unauthorized') {
    errorMessage = {
      title: 'Staff Profile Required',
      detail:
        'Your authenticated identity is valid, but no matching staff profile was found. Please contact the Santhaya Associates administrator.',
    };
  } else if (error === 'inactive') {
    errorMessage = {
      title: 'Account Inactive',
      detail:
        'This staff account is currently inactive or suspended. Access to internal systems is restricted.',
    };
  } else if (error === 'session_expired') {
    errorMessage = {
      title: 'Session Expired',
      detail: 'Your authentication session has expired. Please sign in again to continue.',
    };
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Symbol Lockup */}
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

        <h1 className="text-center text-2xl font-bold tracking-tight text-white">
          Santhaya Associates Pvt. Ltd.
        </h1>
        <p className="mt-1 text-center text-xs font-semibold tracking-wider text-gold-400 uppercase">
          Private Staff Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10 backdrop-blur-sm">
          {/* Status / Error Banner from URL Search Params */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 rounded-lg bg-amber-950/60 border border-amber-500/40 p-4 text-amber-200"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-amber-100">{errorMessage.title}</p>
                  <p className="mt-1 leading-relaxed text-amber-300/90">{errorMessage.detail}</p>
                </div>
              </div>
            </div>
          )}

          {/* Secure Interactive Login Form */}
          <LoginForm redirectTo={redirectTo} />

          {/* Security Notice */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-gold-500" />
                <span>Restricted Access Point</span>
              </span>
              <span>TLS / Rate Limited</span>
            </div>
          </div>

          {/* Navigation Return to Public Site */}
          <div className="mt-4 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-gold-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public Website</span>
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-500">
          Confidential & Proprietary • Santhaya Associates Pvt. Ltd.
        </p>
      </div>
    </div>
  );
}
