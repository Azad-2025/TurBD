import React from 'react';
import { TurfBDLogo } from './TurfBDLogo';

interface LoadingSplashProps {
  message?: string;
}

export const LoadingSplash: React.FC<LoadingSplashProps> = ({
  message = 'Loading pitches & arenas...',
}) => {
  return (
    <div
      id="turfbd-splash-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F7FAF8] text-[#0F172A] p-4 select-none"
    >
      <div className="flex flex-col items-center max-w-sm text-center animate-fadeIn">
        {/* Glowing aura around logo */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-emerald-100/50 blur-2xl rounded-full scale-125 pointer-events-none" />
          <TurfBDLogo
            layout="vertical"
            size="lg"
            variant="brand"
            showTagline={true}
            taglineText="Sports Arena Booking Platform"
            showBadge={true}
            badgeText="Bangladesh"
          />
        </div>

        {/* Loading indicator bar */}
        <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden mt-6 mb-3">
          <div className="w-full h-full bg-gradient-to-r from-[#064E3B] to-[#0FA958] rounded-full animate-pulse" />
        </div>

        <p className="text-xs text-[#64748B] font-medium tracking-wide">
          {message}
        </p>
      </div>
    </div>
  );
};
