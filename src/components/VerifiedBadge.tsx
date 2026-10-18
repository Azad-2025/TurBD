import React from 'react';
import { ShieldCheck, Award, Sparkles, CheckCircle2 } from 'lucide-react';
import { VerifiedBadgeTier } from '../types';

interface VerifiedBadgeProps {
  tier?: VerifiedBadgeTier | string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  tier = 'standard',
  size = 'sm',
  showLabel = true,
  className = '',
}) => {
  if (tier === 'gold_partner') {
    const sizeClasses =
      size === 'lg'
        ? 'px-3 py-1 text-xs gap-1.5'
        : size === 'md'
        ? 'px-2.5 py-0.5 text-[11px] gap-1'
        : 'px-2 py-0.5 text-[10px] gap-1';

    return (
      <span
        title="TurfBD Gold Partner: Inspected FIFA-grade turf, 1000W LED floodlights, instant automated booking verification"
        className={`inline-flex items-center font-extrabold uppercase tracking-wide bg-amber-50 text-amber-900 border border-amber-300/90 rounded-full shadow-2xs backdrop-blur-sm select-none ${sizeClasses} ${className}`}
        id="badge-gold-partner"
      >
        <Sparkles className={size === 'lg' ? 'w-3.5 h-3.5 text-amber-500 fill-amber-500' : 'w-3 h-3 text-amber-500 fill-amber-500'} />
        {showLabel && <span>Gold Partner</span>}
      </span>
    );
  }

  if (tier === 'turfbd_verified' || tier === 'approved') {
    const sizeClasses =
      size === 'lg'
        ? 'px-3 py-1 text-xs gap-1.5'
        : size === 'md'
        ? 'px-2.5 py-0.5 text-[11px] gap-1'
        : 'px-2 py-0.5 text-[10px] gap-1';

    return (
      <span
        title="TurfBD Verified: Field dimensions verified, lighting tested, valid commercial trade license confirmed"
        className={`inline-flex items-center font-bold text-[#064E3B] bg-emerald-50 border border-emerald-200/90 rounded-full shadow-2xs backdrop-blur-sm select-none ${sizeClasses} ${className}`}
        id="badge-turfbd-verified"
      >
        <ShieldCheck className={size === 'lg' ? 'w-3.5 h-3.5 text-[#0FA958]' : 'w-3 h-3 text-[#0FA958]'} />
        {showLabel && <span>Verified Venue</span>}
      </span>
    );
  }

  return null;
};
