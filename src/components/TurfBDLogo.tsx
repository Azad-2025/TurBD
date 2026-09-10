import React from 'react';

export interface TurfBDLogoProps {
  variant?: 'dark' | 'light' | 'original' | 'monochrome';
  layout?: 'horizontal' | 'vertical' | 'icon';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  taglineText?: string;
  showBadge?: boolean;
  badgeText?: string;
  className?: string;
  id?: string;
  onClick?: () => void;
}

/**
 * Official TurfBD Brand Logo Component
 * Precision vector SVG rendering with athletic shield/pin badge & vivid lime checkmark.
 * Exactly matches the official TurfBD brand identity.
 */
export const TurfBDLogo: React.FC<TurfBDLogoProps> = ({
  variant = 'dark',
  layout = 'horizontal',
  size = 'md',
  showTagline = false,
  taglineText = 'Sports Turf Booking',
  showBadge = false,
  badgeText = 'MVP',
  className = '',
  id = 'turfbd-logo',
  onClick,
}) => {
  // Dimensions map based on size
  const iconSizeMap = {
    xs: { w: 20, h: 23, stroke: 8, font: 'text-sm', subFont: 'text-[9px]' },
    sm: { w: 28, h: 32, stroke: 8, font: 'text-base', subFont: 'text-[10px]' },
    md: { w: 38, h: 44, stroke: 8, font: 'text-xl', subFont: 'text-[11px]' },
    lg: { w: 52, h: 60, stroke: 8, font: 'text-3xl', subFont: 'text-xs' },
    xl: { w: 72, h: 83, stroke: 8, font: 'text-4xl', subFont: 'text-sm' },
  };

  const currentSize = iconSizeMap[size] || iconSizeMap.md;

  // Colors
  const shieldColor = '#0E5C26'; // Deep athletic forest green
  const checkColor = '#6AC52B'; // Vibrant pitch lime green

  const isLight = variant === 'light' || variant === 'original';
  const turfTextColor = isLight ? 'text-neutral-900' : 'text-white';
  const bdTextColor = isLight ? (variant === 'original' ? 'text-neutral-900' : 'text-emerald-700') : 'text-emerald-400';

  // Standalone Shield Mark SVG
  const renderMark = (extraClass = '') => (
    <div
      className={`relative flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${extraClass}`}
      style={{ width: currentSize.w, height: currentSize.h }}
    >
      <svg
        viewBox="0 0 100 115"
        className="w-full h-full drop-shadow-sm"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Outer Shield / Location Pin Contour */}
        <path
          d="M 24 24
             C 24 16, 32 12, 44 12
             L 56 12
             C 68 12, 76 16, 76 24
             C 76 44, 70 65, 52 89
             C 51 90.3, 49 90.3, 48 89
             C 30 65, 24 44, 24 24
             Z"
          fill="none"
          stroke={shieldColor}
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Inner Lime Athletic Checkmark */}
        <path
          d="M 38 48
             L 47 58
             L 63 38"
          fill="none"
          stroke={checkColor}
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );

  // Icon only layout
  if (layout === 'icon') {
    return (
      <div id={id} className={`inline-flex items-center justify-center ${className}`} onClick={onClick}>
        {renderMark()}
      </div>
    );
  }

  // Vertical stacked layout (matching the uploaded image asset format)
  if (layout === 'vertical') {
    return (
      <div
        id={id}
        onClick={onClick}
        className={`flex flex-col items-center text-center select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
      >
        {renderMark('mb-2.5')}
        <div className="flex items-center gap-1 leading-none">
          <span className={`font-extrabold ${currentSize.font} tracking-tight ${turfTextColor}`}>
            Turf<span className={bdTextColor}>BD</span>
          </span>
          {showBadge && (
            <span className="text-[10px] uppercase font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded ml-1">
              {badgeText}
            </span>
          )}
        </div>
        {showTagline && (
          <p className={`${currentSize.subFont} text-neutral-400 font-medium mt-1 tracking-normal`}>
            {taglineText}
          </p>
        )}
      </div>
    );
  }

  // Default: Horizontal layout (mark on left, text on right)
  return (
    <div
      id={id}
      onClick={onClick}
      className={`flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      {renderMark()}
      <div className="text-left leading-none">
        <div className="flex items-center gap-1.5">
          <span className={`font-extrabold ${currentSize.font} tracking-tight ${turfTextColor}`}>
            Turf<span className={bdTextColor}>BD</span>
          </span>
          {showBadge && (
            <span className="text-[10px] uppercase font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-1.5 py-0.5 rounded ml-0.5 tracking-wider">
              {badgeText}
            </span>
          )}
        </div>
        {showTagline && (
          <p className={`${currentSize.subFont} text-neutral-400 font-medium mt-1`}>
            {taglineText}
          </p>
        )}
      </div>
    </div>
  );
};
