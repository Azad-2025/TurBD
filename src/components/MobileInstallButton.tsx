import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';
import {
  Download,
  Share2,
  PlusSquare,
  CheckCircle2,
  X,
  Smartphone,
} from 'lucide-react';
import { TurfBDLogo } from './TurfBDLogo';
import { PWAInstallGuideModal } from './PWAInstallGuideModal';

export const MobileInstallButton: React.FC = () => {
  const { isInstalled, isInstallable, isIOS, isElectron, isNativeApp, install, platform } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // 1. If already installed in standalone mode, hide the install button
  // 2. If inside Windows Electron app or native app wrapper, hide the button
  if (isInstalled || isElectron || isNativeApp) {
    return null;
  }

  const handleInstallClick = async () => {
    // Android / Chromium browsers with active beforeinstallprompt
    if (isInstallable) {
      const res = await install();
      if (res.outcome === 'manual') {
        setShowGuideModal(true);
      }
    } else if (isIOS) {
      // iPhone / iPad Safari: Show Apple Add to Home Screen guide
      setShowIOSModal(true);
    } else {
      // Other browsers (Firefox, older WebView, etc.)
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {/* Prominent, clean "Install App" button in mobile UI */}
      <button
        id="mobile-install-app-btn"
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 bg-[#0FA958] hover:bg-[#0da052] active:bg-[#064E3B] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs shadow-[#0FA958]/30 transition-all cursor-pointer active:scale-95 shrink-0"
        title="Install TurfBD App on your device"
        aria-label="Install TurfBD App"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="tracking-tight">Install App</span>
      </button>

      {/* iPhone / iPad Safari Specific Instruction Dialog */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            id="ios-install-guide-modal"
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-2xl text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center border border-slate-200 shadow-2xs">
                  <TurfBDLogo layout="icon-only" size="xs" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
                    Install TurfBD on iPhone
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Quick 3-step home screen setup
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* iOS Instructions */}
            <div className="space-y-2.5 text-xs mb-4">
              <div className="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064E3B] dark:text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Tap Safari Share button</span>
                    <Share2 className="w-3.5 h-3.5 text-blue-500 inline" />
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Located in the center of the Safari bottom toolbar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064E3B] dark:text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Scroll down and tap &quot;Add to Home Screen&quot;</span>
                    <PlusSquare className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 inline" />
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Found in the action sheet options.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064E3B] dark:text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>Tap &quot;Add&quot; in top-right corner</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0FA958] inline" />
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Launches full-screen like a native app with offline caching.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 bg-[#0FA958] hover:bg-[#0da052] active:bg-[#064E3B] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Standard Guide Modal for Other Browsers */}
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
