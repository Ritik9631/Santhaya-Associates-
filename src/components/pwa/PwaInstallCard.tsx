'use client';

import React, { useEffect, useState } from 'react';
import { Download, CheckCircle2, Monitor, Smartphone, HelpCircle, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Check if running in standalone display mode
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Listen for custom event from StaffPwaManager
    const handlePromptReady = (e: Event) => {
      const customEvent = e as CustomEvent<BeforeInstallPromptEvent>;
      if (customEvent.detail) {
        setDeferredPrompt(customEvent.detail);
      }
    };

    window.addEventListener('pwa-deferred-prompt-ready', handlePromptReady);

    // Also listen directly if prompt fires on this page
    const directPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', directPrompt);

    const handleInstalled = () => {
      setInstallSuccess(true);
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('pwa-deferred-prompt-ready', handlePromptReady);
      window.removeEventListener('beforeinstallprompt', directPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallSuccess(true);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-6">
      {/* Installation State Banner */}
      {isStandalone || installSuccess ? (
        <div className="bg-emerald-950/60 border border-emerald-600/50 rounded-lg p-4 flex items-center gap-3 text-emerald-300">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <div className="text-sm">
            <span className="font-bold text-white block">Santhaya Staff is Installed</span>
            You are operating in standalone application mode directly from your desktop or home screen.
          </div>
        </div>
      ) : deferredPrompt ? (
        <div className="bg-gradient-to-r from-navy-900 to-slate-900 border border-gold-500/40 rounded-lg p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gold-500/20 text-gold-400 border border-gold-500/30">
                1-Click Ready
              </span>
              <span className="text-sm font-bold text-white">Browser Installation Detected</span>
            </div>
            <p className="text-xs text-slate-300">
              Install Santhaya Staff to your Windows taskbar or Android home screen for direct access without browser tabs.
            </p>
          </div>
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold text-sm shadow-md transition-all flex-shrink-0 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isInstalling ? 'Installing...' : 'Install Santhaya Staff'}</span>
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-4 flex items-start gap-3 text-slate-300">
          <HelpCircle className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-1">
            <span className="font-semibold text-white block">Manual Installation via Browser Menu</span>
            <p className="text-slate-400">
              If your browser doesn&apos;t show an automatic prompt, you can install Santhaya Staff directly using the browser address bar icon or menu instructions below.
            </p>
          </div>
        </div>
      )}

      {/* OS-Specific Step-by-Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Windows (Edge & Chrome) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-2">
            <Monitor className="w-4 h-4 text-gold-400" />
            <span>Windows 10 / 11 (Edge &amp; Chrome)</span>
          </div>
          <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
            <li>
              Open <span className="font-mono text-gold-300 bg-slate-900 px-1 py-0.5 rounded">/staff</span> in <strong>Microsoft Edge</strong> or <strong>Google Chrome</strong>.
            </li>
            <li>
              Look for the <strong>Install App icon (⊕ or 💻)</strong> in the right side of the address bar.
            </li>
            <li>
              Alternatively, click the <strong>three dots menu (⋮ or ...)</strong> &gt; <strong>Apps</strong> &gt; <strong>Install Santhaya Staff</strong>.
            </li>
            <li>
              Click <strong>Install</strong>. Santhaya Staff will open in its own standalone desktop window and appear in your <strong>Start menu</strong> and <strong>Taskbar</strong>.
            </li>
          </ol>
        </div>

        {/* Android (Chrome) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-2">
            <Smartphone className="w-4 h-4 text-gold-400" />
            <span>Android (Google Chrome)</span>
          </div>
          <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
            <li>
              Open the staff portal in <strong>Chrome on your Android device</strong>.
            </li>
            <li>
              Tap the <strong>three dots menu (⋮)</strong> in the top right corner of Chrome.
            </li>
            <li>
              Tap <strong>Install App</strong> (or <strong>Add to Home screen</strong>).
            </li>
            <li>
              Confirm by tapping <strong>Install</strong>. Santhaya Staff icon will be placed directly on your phone home screen for 1-tap launching.
            </li>
          </ol>
        </div>
      </div>

      {/* Enterprise Security Notice */}
      <div className="bg-navy-950/60 border border-navy-800/80 rounded-lg p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white block mb-0.5">Corporate Governance &amp; Security Requirements</strong>
          Santhaya Staff is an internal Progressive Web App distributed securely through our enterprise infrastructure (no Google Play Store download required). Access requires active, authorized employee credentials. The app functions online-only to guarantee strict GST calculation accuracy and zero offline data exposure.
        </div>
      </div>
    </div>
  );
}
