import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { Download, X } from 'lucide-react';
import { TurfBDLogo } from './TurfBDLogo';
import { PWAInstallGuideModal } from './PWAInstallGuideModal';

interface PWAInstallBannerProps {
  compact?: boolean;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ compact = false }) => {
  const { canShowInstallPrompt, isInstallable, install, platform } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem('turfbd_pwa_banner_dismissed');
    if (dismissedAt) {
      const elapsedHours = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      if (elapsedHours < 24) {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('turfbd_pwa_banner_dismissed', Date.now().toString());
  };

  // STRICT CONDITIONAL RENDERING GATE:
  // 1. Must be on desktop website browser (>= 1024px)
  // 2. Hidden on mobile viewports (< 1024px)
  // 3. Hidden in installed PWA standalone mode
  // 4. Hidden inside Windows Electron desktop application
  // 5. Hidden in any native app wrapper
  // 6. Hidden if browser has no valid active install event
  if (!canShowInstallPrompt) {
    return null;
  }

  // If banner mode (non-compact) and dismissed within 24h, hide banner
  if (!compact && isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const res = await install();
      if (res.outcome === 'manual') {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  if (compact) {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 bg-[#0FA958] hover:bg-[#0da052] active:bg-[#064E3B] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-xs shadow-[#0FA958]/30 transition-all cursor-pointer active:scale-95"
          id="pwa-compact-install-btn"
          title="Install TurfBD Desktop App"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>

        {showGuideModal && (
          <PWAInstallGuideModal
            isOpen={showGuideModal}
            onClose={() => setShowGuideModal(false)}
            defaultPlatform={platform}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        id="pwa-install-banner"
        className="w-full bg-gradient-to-r from-[#064E3B] to-[#0FA958] text-white p-3 sm:p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-3 mb-4 animate-in fade-in slide-in-from-top-2"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-xs">
            <TurfBDLogo layout="icon-only" size="xs" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-extrabold text-white tracking-tight">
                Install TurfBD App
              </h4>
              <span className="bg-emerald-300 text-emerald-950 text-[9px] font-black uppercase px-1.5 py-0.2 rounded font-mono">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/90 leading-tight mt-0.5">
              Instant pitch bookings, live radar &amp; offline access
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="bg-white hover:bg-emerald-50 active:bg-emerald-100 text-[#064E3B] font-black text-xs px-3.5 py-2 rounded-xl shadow-xs transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
            id="pwa-banner-action-btn"
          >
            <Download className="w-3.5 h-3.5 text-[#0FA958]" />
            <span>Install</span>
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss app banner"
            className="text-emerald-200 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showGuideModal && (
        <PWAInstallGuideModal
          isOpen={showGuideModal}
          onClose={() => setShowGuideModal(false)}
          defaultPlatform={platform}
        />
      )}
    </>
  );
};
