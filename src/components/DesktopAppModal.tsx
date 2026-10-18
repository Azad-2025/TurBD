import React, { useState } from 'react';
import {
  Monitor,
  Download,
  CheckCircle2,
  Cpu,
  Layers,
  ShieldCheck,
  X,
  Radio,
  FileCode2,
} from 'lucide-react';
import { TurfBDLogo } from './TurfBDLogo';

interface DesktopAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopAppModal: React.FC<DesktopAppModalProps> = ({ isOpen, onClose }) => {
  const [downloadStarted, setDownloadStarted] = useState(false);

  if (!isOpen) return null;

  const handleDownloadClick = () => {
    setDownloadStarted(true);
    // Trigger download of release package or installer placeholder
    const downloadUrl = '/downloads/TurfBD-Setup.exe';
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'TurfBD-Setup.exe';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#064E3B] to-[#043326] p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <Monitor className="w-6 h-6 text-[#10B981]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">TurfBD for Windows</h2>
                <span className="bg-[#10B981] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  v1.2.0 x64
                </span>
              </div>
              <p className="text-xs text-emerald-200 font-medium">
                Native Windows Desktop Client (Customer, Owner & Admin Edition)
              </p>
            </div>
          </div>

          <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-100 flex items-start gap-2.5">
            <Radio className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-semibold text-white">Shared Live Database Architecture</p>
              <p className="text-[11px] text-emerald-200/90 mt-0.5">
                The desktop app connects to the central TurfBD Cloud server. All bookings, slots, and owner updates synchronize across every PC in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Advantages */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Desktop Application Capabilities
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#0FA958] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">100% Shared Data</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Turf owners & admins see live match reservations as customers book them.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-start gap-2.5">
                <Cpu className="w-4 h-4 text-[#0FA958] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">High-Performance Engine</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Optimized Chromium & Node.js runtime with instant desktop launch.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#0FA958] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Three Built-in Roles</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Customer, Turf Owner & Super Admin supported with server-side RBAC.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-[#0FA958] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Identical TurfBD UI</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Zero learning curve—uses the exact same responsive React application.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Installation Details */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5 text-[#0FA958]" />
              Installation Steps:
            </h4>
            <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-decimal pl-4">
              <li>
                Download <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">TurfBD-Setup.exe</span> (Installer).
              </li>
              <li>
                Run the installer and follow the Windows setup wizard.
              </li>
              <li>
                Launch <strong>TurfBD</strong> from your Windows Desktop or Start Menu.
              </li>
              <li>
                Log in with your verified Customer, Owner, or Admin account to access real live data.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            <span>Requires: Windows 10/11 64-bit</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleDownloadClick}
              className="px-5 py-2.5 bg-[#0FA958] hover:bg-[#0b8a46] text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{downloadStarted ? 'Downloading TurfBD-Setup.exe...' : 'Download TurfBD-Setup.exe'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
