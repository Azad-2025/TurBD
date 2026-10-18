import React from 'react';
import { Turf } from '../types';
import { useApp } from '../context/AppContext';
import {
  MapPin,
  Zap,
  Tag,
  ChevronRight,
} from 'lucide-react';

interface TurfCardProps {
  turf: Turf;
  index?: number;
  totalCount?: number;
  featuredHorizontal?: boolean;
}

// Convert 24-hour "HH:mm" to 12-hour "hh:mm AM/PM"
function formatTime12(timeStr: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const formattedH = h < 10 ? `0${h}` : `${h}`;
  return `${formattedH}:${m} ${ampm}`;
}

function formatSlotRange(openingTime?: string, closingTime?: string): string {
  const open = formatTime12(openingTime || '06:00');
  const close = formatTime12(closingTime || '02:00');
  return `${open} – ${close}`;
}

export const TurfCard: React.FC<TurfCardProps> = ({
  turf,
  index = 0,
  totalCount = 5,
  featuredHorizontal = false,
}) => {
  const { setSelectedTurf, setBookingTurf } = useApp();

  const images = turf.images && turf.images.length > 0
    ? turf.images
    : ['https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80'];

  const bgImage = images[0];

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    setSelectedTurf(turf);
  };

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate?.(8);
      } catch {
        // Ignore
      }
    }
  };

  const handleBookClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    setBookingTurf(turf);
  };

  // Availability calculation
  const isAvailable =
    turf.status === 'approved' &&
    (turf.availableSlotsCount === undefined || turf.availableSlotsCount > 0);

  // Render title in 20px-24px bold style
  const renderTitle = () => {
    const nameLower = turf.name.toLowerCase();
    if (nameLower.includes('dhanmondi')) {
      return (
        <div className="flex flex-col leading-tight">
          <span className="text-[17px] sm:text-[19px] font-bold text-white tracking-tight drop-shadow-md">
            TurfBD
          </span>
          <span className="text-[20px] xs:text-[22px] sm:text-[24px] font-bold text-[#00D06C] tracking-tight drop-shadow-md -mt-0.5">
            Dhanmondi Turf
          </span>
        </div>
      );
    }

    const parts = turf.name.split(' ');
    const first = parts[0];
    const rest = parts.slice(1).join(' ');

    return (
      <div className="text-[20px] xs:text-[22px] sm:text-[24px] font-bold tracking-tight leading-tight drop-shadow-md">
        <span className="text-white">{first} </span>
        <span className="text-[#00D06C]">{rest}</span>
      </div>
    );
  };

  const currentNumber = index + 1;
  const maxNumber = Math.max(totalCount, 5);

  return (
    <div
      onClick={handleCardClick}
      id={`turf-card-${turf.id}`}
      className={`group relative overflow-hidden rounded-2xl bg-slate-950 border border-slate-800/90 shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:border-emerald-500/40 transition-all duration-200 cursor-pointer flex flex-col justify-between h-[235px] xs:h-[242px] sm:h-[248px] select-none ${
        featuredHorizontal
          ? 'w-[320px] sm:w-[360px] shrink-0'
          : 'w-[94%] xs:w-[94%] sm:w-full mx-auto'
      }`}
    >
      {/* 1. FULL-WIDTH BACKGROUND IMAGE & DARK GRADIENT OVERLAY */}
      <div className="absolute inset-0 w-full h-full bg-slate-950 pointer-events-none">
        <img
          src={bgImage}
          alt={turf.name}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        {/* Dark gradient overlay for optimal contrast and readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/35" />
      </div>

      {/* 2. TOP SECTION: Location Badge (Left) & Availability Badge (Right) */}
      <div className="relative z-10 p-4 sm:p-4.5 flex items-start justify-between gap-2.5 pointer-events-none">
        {/* Top Left: Location badge on image */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-emerald-500/25 text-white text-xs sm:text-[13px] font-medium shadow-xs pointer-events-auto">
          <MapPin className="w-3.5 h-3.5 text-[#00D06C] fill-[#00D06C]" />
          <span className="truncate max-w-[180px] sm:max-w-[240px]">
            {turf.area}, {turf.city}
          </span>
        </div>

        {/* Top Right: Availability Badge */}
        <div className="pointer-events-auto shrink-0">
          {isAvailable ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-emerald-500/25 text-[#00E676] text-xs sm:text-[13px] font-bold shadow-xs">
              <Zap className="w-3.5 h-3.5 text-[#00E676] fill-[#00E676]" />
              <span>Available Now</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-rose-500/30 text-rose-400 text-xs sm:text-[13px] font-bold shadow-xs">
              <span>Booked Today</span>
            </span>
          )}
        </div>
      </div>

      {/* 3. MIDDLE SECTION: Large Turf Name & Description */}
      <div className="relative z-10 px-4 sm:px-4.5 pb-0 flex flex-col justify-end">
        {/* Image index counter badge on right side */}
        <div className="absolute right-4 bottom-[72px] bg-black/75 backdrop-blur-xs text-[11px] text-slate-200 px-2.5 py-0.5 rounded font-mono border border-white/10 select-none">
          {currentNumber}/{maxNumber}
        </div>

        {/* Large Turf Name (20px-24px bold) & Description (13px-14px) */}
        <div className="mb-2.5">
          {renderTitle()}
          <p className="text-[13px] sm:text-[14px] text-slate-200 font-normal line-clamp-1 mt-1 drop-shadow-xs max-w-xl">
            {turf.tagline || turf.description}
          </p>
        </div>

        {/* 4. BOTTOM INFORMATION PANEL: Balanced Slot Price box and Book Now button */}
        <div className="h-[56px] sm:h-[60px] bg-black/85 backdrop-blur-md rounded-xl px-3 sm:px-4 py-2 border border-white/10 shadow-xl flex items-center justify-between gap-3 mb-3 sm:mb-3.5">
          {/* LEFT: Slot Price (as a clean small box) */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/[0.07] border border-white/10 shadow-inner">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Tag className="w-3.5 h-3.5 text-[#00D06C]" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase tracking-wider leading-none">
                Slot Price
              </span>
              <span className="text-xs sm:text-sm font-black text-white font-mono whitespace-nowrap leading-tight mt-0.5">
                BDT {turf.hourlyRate.toLocaleString()}/hr
              </span>
            </div>
          </div>

          {/* RIGHT: Book Now Button Box */}
          <button
            onClick={handleBookClick}
            id={`book-now-${turf.id}`}
            aria-label={`Book ${turf.name}`}
            className="px-4 py-2 sm:px-5 sm:py-2.5 bg-[#00D06C] hover:bg-[#00b85f] active:bg-[#064E3B] text-slate-950 font-black text-xs sm:text-sm rounded-xl flex items-center gap-1.5 shadow-md shadow-[#00D06C]/30 shrink-0 whitespace-nowrap cursor-pointer active:scale-95 transition-all"
          >
            <span>Book Now</span>
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};
