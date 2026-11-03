import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowLeft, Smartphone, Monitor, ShieldCheck, Download, HelpCircle, CheckCircle2 } from 'lucide-react';
import { PwaInstallCard } from '@/components/pwa/PwaInstallCard';

export const metadata: Metadata = {
  title: 'App Installation Guide | Santhaya Staff ERP',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PwaHelpPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/staff"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <span>Install Santhaya Staff App</span>
            <span className="text-xs px-2 py-0.5 rounded bg-gold-500/20 text-gold-400 border border-gold-500/30">
              PWA
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Install Santhaya Staff on your Windows computer or Android phone for instant taskbar and home screen access.
          </p>
        </div>
      </div>

      {/* Interactive Install Component & OS Instructions */}
      <PwaInstallCard />

      {/* Staff FAQ Accordion / Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-gold-400" />
          <span>Frequently Asked Questions</span>
        </h2>

        <div className="space-y-3 text-xs sm:text-sm text-slate-300 divide-y divide-slate-800/80">
          <div className="pt-2">
            <strong className="text-white block mb-1">Do I need to download this from the Google Play Store or Microsoft Store?</strong>
            <p className="text-slate-400">
              No. Santhaya Staff is an authorized Progressive Web App (PWA) distributed directly through Santhaya Associates&apos; secure servers. You install it directly from your web browser in seconds without third-party app store accounts or approvals.
            </p>
          </div>

          <div className="pt-3">
            <strong className="text-white block mb-1">Can I create quotations or edit tax invoices while offline?</strong>
            <p className="text-slate-400">
              No. For statutory corporate governance, anti-fraud compliance, and strict GST calculation integrity, Santhaya Staff operates strictly online. An active internet connection is required to access, create, or modify any commercial records.
            </p>
          </div>

          <div className="pt-3">
            <strong className="text-white block mb-1">How do I update Santhaya Staff when new features are released?</strong>
            <p className="text-slate-400">
              Updates happen automatically in the background whenever you open the application. You do not need to manually reinstall or update from an app store.
            </p>
          </div>

          <div className="pt-3">
            <strong className="text-white block mb-1">How do I uninstall the app if I need to remove it?</strong>
            <p className="text-slate-400">
              On Windows, right-click Santhaya Staff in your Start menu or Windows Settings &gt; Installed Apps &gt; Uninstall. On Android, tap and hold the app icon on your home screen and select &ldquo;Uninstall&rdquo; or &ldquo;Remove&rdquo;.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
