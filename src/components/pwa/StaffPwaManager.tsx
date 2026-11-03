'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, Download, CheckCircle2, Monitor, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function StaffPwaManager() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Check standalone mode (already installed & running in app window)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isStandaloneMode);

    // 2. Register Service Worker on /staff scope
    if ('serviceWorker' in navigator && window.location.pathname.startsWith('/staff')) {
      navigator.serviceWorker
        .register('/staff-sw.js', { scope: '/staff' })
        .then((registration) => {
          // Check for service worker updates periodically
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[Santhaya Staff PWA] New service worker installed and ready.');
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('[Santhaya Staff PWA] Service Worker registration failed:', err);
        });
    }

    // 3. Network online/offline monitoring
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 4. Listen for beforeinstallprompt event (Chromium PWA install trigger)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      // Dispatch custom window event so child components or help page can hook into it
      window.dispatchEvent(new CustomEvent('pwa-deferred-prompt-ready', { detail: promptEvent }));
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      console.log('[Santhaya Staff PWA] App was successfully installed.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return (
    <>
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-amber-500/95 text-navy-950 px-4 py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 sticky top-16 z-50 backdrop-blur-md shadow-md border-b border-amber-600 print:hidden"
        >
          <WifiOff className="w-4 h-4 flex-shrink-0 text-navy-950" />
          <span>
            Offline Mode Protected: Santhaya Staff requires internet connectivity for ERP operations. Reconnect to resume live billing and quotation workflows.
          </span>
        </div>
      )}

      {/* Reconnected Banner */}
      {showReconnected && isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="bg-emerald-600 text-white px-4 py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 sticky top-16 z-50 backdrop-blur-md shadow-md border-b border-emerald-700 animate-fade-in print:hidden"
        >
          <Wifi className="w-4 h-4 flex-shrink-0" />
          <span>Back online: Reconnected to Santhaya Associates ERP services.</span>
        </div>
      )}
    </>
  );
}

