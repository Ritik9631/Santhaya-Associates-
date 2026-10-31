import React from 'react';
import Image from 'next/image';
import { requireStaffSession } from '@/lib/auth/session';
import { logoutAction } from '@/lib/auth/actions';
import { ShieldCheck, LogOut } from 'lucide-react';
import { StaffSidebar } from './StaffSidebar';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Staff Management ERP | Santhaya Associates Pvt. Ltd.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Dual-barrier server guard: throws redirect to /staff/login if invalid or inactive
  const { user, profile } = await requireStaffSession();

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Administrator',
    admin: 'Administrator',
    estimator: 'Tender Estimator',
    billing_manager: 'Billing & GST Manager',
    viewer: 'Auditor / Viewer',
  };

  const roleDisplay = roleLabels[profile.role] || profile.role;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans print:bg-white print:text-black print:min-h-0 print:block">
      {/* Top Staff Header Bar (Hidden in Print) */}
      <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-40 backdrop-blur-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Portal Identity */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-white rounded-lg p-1 flex items-center justify-center flex-shrink-0 border border-slate-700">
                <Image
                  src="/santhaya-symbol.png"
                  alt="Santhaya Associates Symbol"
                  width={36}
                  height={42}
                  priority
                  className="h-full w-auto object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-wide text-white">
                    SANTHAYA ASSOCIATES
                  </span>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-gold-500/20 text-gold-400 border border-gold-500/30">
                    Staff Portal
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 hidden sm:block">
                  Internal Management ERP • Stage 3A Protected
                </p>
              </div>
            </div>

            {/* User Profile Badge & Logout Action */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-200">
                  {profile.full_name || user.email}
                </div>
                <div className="text-[11px] text-gold-400 flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                  <span>{roleDisplay}</span>
                </div>
              </div>

              <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold text-xs">
                {(profile.full_name?.[0] || user.email?.[0] || 'S').toUpperCase()}
              </div>

              {/* Secure Server-Side Logout Button */}
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                  title="Sign out of staff session"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto print:max-w-none print:w-full print:block">
        <div className="print:hidden">
          <StaffSidebar userRole={profile.role} userName={profile.full_name} />
        </div>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden print:p-0 print:m-0 print:overflow-visible print:w-full">
          {children}
        </main>
      </div>

      {/* Security & Confidentiality Footer (Hidden in Print) */}
      <footer className="border-t border-slate-800/60 bg-slate-950 py-4 text-center text-xs text-slate-400 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Authenticated Session Active • Private Business System</span>
          </div>
          <div>
            <span>Santhaya Associates Pvt. Ltd. • All Rights Reserved</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
