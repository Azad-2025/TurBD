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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950 text-neutral-100 p-4 select-none"
    >
      <div className="flex flex-col items-center max-w-sm text-center animate-fadeIn">
        {/* Glowing aura around logo */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full scale-125 pointer-events-none" />
          <TurfBDLogo
            layout="vertical"
            size="lg"
            variant="dark"
            showTagline={true}
            taglineText="Sports Arena Booking Platform"
            showBadge={true}
            badgeText="Bangladesh"
          />
        </div>

        {/* Loading indicator bar */}
        <div className="w-48 h-1 bg-neutral-800 rounded-full overflow-hidden mt-6 mb-3">
          <div className="w-full h-full bg-gradient-to-r from-emerald-600 to-lime-400 rounded-full animate-pulse" />
        </div>

        <p className="text-xs text-neutral-400 font-medium tracking-wide">
          {message}
        </p>
      </div>
    </div>
  );
};
