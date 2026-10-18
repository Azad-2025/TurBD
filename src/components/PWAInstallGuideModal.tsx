import React, { useState } from 'react';
import {
  Smartphone,
  Monitor,
  Share2,
  PlusSquare,
  CheckCircle2,
  X,
  MoreVertical,
  Download,
  AlertCircle,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { TurfBDLogo } from './TurfBDLogo';
import { usePWAInstall } from '../utils/usePWAInstall';

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlatform?: 'ios' | 'android' | 'desktop';
}

export const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({
  isOpen,
  onClose,
  defaultPlatform,
}) => {
  const { isInstallable, install, platform: detectedPlatform } = usePWAInstall();
  const initialTab = defaultPlatform || detectedPlatform || 'android';
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>(initialTab);
  const [tryingPrompt, setTryingPrompt] = useState(false);

  if (!isOpen) return null;

  const handleTryAutomatic = async () => {
    setTryingPrompt(true);
    const res = await install();
    setTryingPrompt(false);
    if (res.outcome === 'accepted') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-4 duration-300 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        id="pwa-install-guide-modal"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center border border-slate-200 shadow-2xs">
              <TurfBDLogo layout="icon-only" size="xs" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Install TurfBD App</h3>
                <span className="bg-[#0FA958] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full font-mono">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Add to your device home screen for instant access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close installation guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Automatic Install Button (if browser prompt is ready) */}
        {isInstallable && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200 font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#0FA958] shrink-0" />
              <span>1-Click Install Available</span>
            </div>
            <button
              onClick={handleTryAutomatic}
              disabled={tryingPrompt}
              className="px-3.5 py-1.5 bg-[#0FA958] hover:bg-[#0da052] active:bg-[#064E3B] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0"
              id="pwa-guide-auto-install-btn"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{tryingPrompt ? 'Prompting...' : 'Install Now'}</span>
            </button>
          </div>
        )}

        {/* Device Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl mb-4 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iPhone / iPad</span>
          </button>
          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
        </div>

        {/* TAB 1: ANDROID GUIDE */}
        {activeTab === 'android' && (
          <div className="space-y-3 text-xs mb-5 animate-in fade-in duration-150">
            <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064E3B] dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Tap the browser menu
                  <MoreVertical className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Look for the 3 dots in the top-right corner of Chrome, Brave, or Samsung Internet.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064E3B] dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Select &quot;Install app&quot; or &quot;Add to Home screen&quot;
                  <Download className="w-3.5 h-3.5 text-[#0FA958]" />
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  This installs the verified standalone TurfBD web application directly to your launcher.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064E3B] dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  Confirm &quot;Install&quot;
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0FA958]" />
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  TurfBD icon will appear on your phone home screen with full offline caching and no browser address bar!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: iOS GUIDE */}
        {activeTab === 'ios' && (
          <div className="space-y-3 text-xs mb-5 animate-in fade-in duration-150">
            <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064E3B] dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Tap Safari Share button
                  <Share2 className="w-3.5 h-3.5 text-blue-600" />
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  In Safari, tap the box with an arrow pointing up at the bottom center of your screen.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064E3B] dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Select &quot;Add to Home Screen&quot;
                  <PlusSquare className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Scroll down the share sheet menu options until you see &quot;Add to Home Screen&quot;.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064E3B] dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  Tap &quot;Add&quot; in top-right corner
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0FA958]" />
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  TurfBD launches in standalone fullscreen mode just like an App Store app!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DESKTOP GUIDE */}
        {activeTab === 'desktop' && (
          <div className="space-y-3 text-xs mb-5 animate-in fade-in duration-150">
            <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064E3B] dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Look at the browser URL bar
                  <Monitor className="w-3.5 h-3.5 text-[#0FA958]" />
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  On Chrome or Edge, click the small &quot;Install TurfBD&quot; icon (computer with down arrow) on the right side of the address bar.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064E3B] dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Or use the browser settings menu
                  <MoreVertical className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Click the 3 dots menu &rarr; &quot;Save and share&quot; / &quot;Apps&quot; &rarr; &quot;Install TurfBD&quot;.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064E3B] dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  Dedicated Window &amp; Desktop Icon
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0FA958]" />
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  TurfBD opens as a standalone desktop window and can be pinned to your Taskbar or Dock.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Graceful Browser Compatibility Callout */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl mb-4 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p>
            <strong>Browser Note:</strong> For best experience, open TurfBD in <strong>Google Chrome</strong> (Android/PC), <strong>Safari</strong> (iOS), or <strong>Microsoft Edge</strong>. In-app webviews (like Facebook/Instagram) do not support home screen installation.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-[#0FA958] hover:bg-[#0da052] text-white font-bold rounded-2xl text-xs transition-colors cursor-pointer shadow-sm shadow-[#0FA958]/20"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
