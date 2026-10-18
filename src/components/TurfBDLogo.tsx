import React from 'react';

export interface TurfBDLogoProps {
  variant?: 'brand' | 'dark' | 'light' | 'monochrome';
  layout?: 'horizontal' | 'vertical' | 'icon' | 'icon-only';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  taglineText?: string;
  showBadge?: boolean;
  badgeText?: string;
  useImage?: boolean;
  className?: string;
  id?: string;
  onClick?: () => void;
}

/**
 * Official TurfBD Brand Logo Component
 * Renders the official TurfBD brand identity consistently across Mobile, Tablet, Desktop & Windows:
 * - Green shield emblem with layered emerald gradients
 * - Stylized central white 'T' and dual white turf field swooshes
 * - Classic soccer ball perched on top-right cusp
 * - Dual-tone 'Turf' (deep dark green) and 'BD' (bright vibrant green) wordmark
 * - Optional 'SPORTS' badge and 'PLAY MORE. LIVE BETTER.' tagline
 * 
 * Note: Uses unique React instance IDs for SVG linearGradients to prevent cross-DOM collision
 * when both mobile and desktop headers are mounted simultaneously.
 */
export const TurfBDLogo: React.FC<TurfBDLogoProps> = ({
  variant = 'brand',
  layout = 'horizontal',
  size = 'md',
  showTagline = false,
  taglineText = 'PLAY MORE. LIVE BETTER.',
  showBadge = false,
  badgeText = 'Sports',
  useImage = false,
  className = '',
  id,
  onClick,
}) => {
  // Generate a globally unique instance ID to avoid SVG <defs> linearGradient ID collision
  // in cases where both mobile and desktop headers are simultaneously mounted in the DOM.
  const rawId = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const instanceId = id ? `${id}-${rawId}` : `turfbd-logo-${rawId}`;

  // Dimensions map based on size (strictly preserving 320:360 ~ 8:9 aspect ratio)
  const iconSizeMap = {
    xs: { w: 24, h: 27, imgH: 26, font: 'text-sm', subFont: 'text-[9px]' },
    sm: { w: 32, h: 36, imgH: 34, font: 'text-base', subFont: 'text-[10px]' },
    md: { w: 38, h: 43, imgH: 40, font: 'text-xl', subFont: 'text-[10px]' },
    lg: { w: 52, h: 58, imgH: 56, font: 'text-2xl sm:text-3xl', subFont: 'text-xs' },
    xl: { w: 76, h: 86, imgH: 80, font: 'text-4xl sm:text-5xl', subFont: 'text-sm' },
  };

  const currentSize = iconSizeMap[size] || iconSizeMap.md;

  // Dedicated SVG Shield, Letter T & Soccer Ball Mark
  const renderMark = (extraClass = '') => (
    <div
      className={`relative flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 select-none ${extraClass}`}
      style={{
        width: currentSize.w,
        height: currentSize.h,
        minWidth: currentSize.w,
        minHeight: currentSize.h,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 320 360"
        className="w-full h-full drop-shadow-xs overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`crestDarkRim-${instanceId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#024D26" />
            <stop offset="60%" stopColor="#006A35" />
            <stop offset="100%" stopColor="#008A42" />
          </linearGradient>

          <linearGradient id={`crestMain-${instanceId}`} x1="15%" y1="10%" x2="85%" y2="90%">
            <stop offset="0%" stopColor="#008E44" />
            <stop offset="45%" stopColor="#00A850" />
            <stop offset="100%" stopColor="#007537" />
          </linearGradient>

          <linearGradient id={`crestHighlight-${instanceId}`} x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#15803D" />
          </linearGradient>

          <linearGradient id={`lowerHillGrad-${instanceId}`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#008840" />
            <stop offset="50%" stopColor="#16A34A" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
        </defs>

        {/* Shield Body Group */}
        <g id={`crest-shield-group-${instanceId}`}>
          {/* Outer Shield Silhouette */}
          <path
            d="M 160 345
               C 125 300, 20 190, 20 120
               C 20 48, 75 20, 160 20
               C 245 20, 300 48, 300 120
               C 300 190, 195 300, 160 345
               Z"
            fill={`url(#crestDarkRim-${instanceId})`}
          />

          {/* Inner Shield Body */}
          <path
            d="M 160 336
               C 128 294, 30 188, 30 121
               C 30 56, 80 29, 160 29
               C 240 29, 290 56, 290 121
               C 290 188, 192 294, 160 336
               Z"
            fill={`url(#crestMain-${instanceId})`}
          />

          {/* Top-Left Inner Arc Shadow / Depth Layer */}
          <path
            d="M 38 112
               C 38 65, 85 36, 158 32
               C 110 43, 75 78, 65 132
               C 55 186, 100 242, 160 336
               C 130 298, 38 198, 38 112
               Z"
            fill="#01522A"
            opacity="0.85"
          />

          {/* Right Side Bright Crest Layer */}
          <path
            d="M 160 29
               C 232 29, 290 58, 290 121
               C 290 188, 200 286, 160 336
               C 185 288, 268 200, 268 126
               C 268 72, 222 38, 160 29
               Z"
            fill={`url(#crestHighlight-${instanceId})`}
            opacity="0.9"
          />

          {/* Lower Dynamic Curved Grass Hill */}
          <path
            d="M 72 272
               C 112 224, 180 195, 286 186
               C 280 210, 266 238, 248 262
               C 210 306, 170 330, 160 336
               C 146 316, 106 292, 72 272
               Z"
            fill={`url(#lowerHillGrad-${instanceId})`}
          />

          {/* White Curved Turf Track Lines / Swooshes */}
          <path
            d="M 132 319
               C 156 288, 195 254, 268 223"
            stroke="#FFFFFF"
            strokeWidth="8.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 160 283
               C 184 252, 226 223, 286 206"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            opacity="0.95"
          />

          {/* Stylized Central White Letter T */}
          <path
            d="M 88 128
               C 88 112, 102 106, 126 106
               L 226 106
               C 246 106, 258 112, 258 125
               C 258 138, 246 144, 226 144
               L 190 144
               C 186 144, 183 147, 183 152
               L 180 240
               C 179 257, 167 268, 150 267
               C 133 266, 123 253, 124 238
               L 127 152
               C 127 147, 124 144, 119 144
               L 106 144
               C 94 144, 88 139, 88 128
               Z"
            fill="#FFFFFF"
          />

          <path
            d="M 106 116
               L 240 116
               C 250 116, 256 120, 254 127
               C 249 134, 240 136, 226 136
               L 120 136
               C 109 136, 102 132, 102 125
               C 102 120, 104 116, 106 116
               Z"
            fill="#FFFFFF"
          />
        </g>

        {/* SOCCER BALL (Football) at Top-Right Cusp */}
        <g id={`crest-soccer-ball-${instanceId}`} transform="translate(232, 62)">
          <circle cx="0" cy="0" r="37" fill="#FFFFFF" stroke="#005A2B" strokeWidth="3" />
          <polygon points="0,-15 14,-5 9,12 -9,12 -14,-5" fill="#111827" />
          <line x1="0" y1="-15" x2="0" y2="-35" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="14" y1="-5" x2="33" y2="-11" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="9" y1="12" x2="21" y2="29" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="-9" y1="12" x2="-21" y2="29" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="-14" y1="-5" x2="-33" y2="-11" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M -15 -32 L 0 -35 L 15 -32 L 11 -24 L -11 -24 Z" fill="#111827" />
          <path d="M 33 -11 L 36 6 L 25 14 L 21 2 L 26 -7 Z" fill="#111827" />
          <path d="M 21 29 L 4 36 L -4 36 L 4 24 L 16 21 Z" fill="#111827" />
          <path d="M -21 29 L -16 21 L -4 24 L -4 36 Z" fill="#111827" />
          <path d="M -33 -11 L -28 -7 L -22 2 L -27 15 L -38 6 Z" fill="#111827" />
        </g>
      </svg>
    </div>
  );

  // If useImage is true, use the raster PNG
  if (useImage) {
    if (layout === 'icon' || layout === 'icon-only') {
      return (
        <div id={id || instanceId} className={`inline-flex items-center justify-center shrink-0 ${className}`} onClick={onClick}>
          <img
            src="/turflogo.png"
            alt="TurfBD Logo"
            className="object-contain"
            style={{ height: currentSize.imgH, width: 'auto' }}
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }

    if (layout === 'vertical') {
      return (
        <div
          id={id || instanceId}
          onClick={onClick}
          className={`flex flex-col items-center text-center select-none shrink-0 ${onClick ? 'cursor-pointer group' : ''} ${className}`}
        >
          <img
            src="/turflogo.png"
            alt="TurfBD Logo"
            className="object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-105"
            style={{ height: currentSize.imgH * 1.8, width: 'auto' }}
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }

    if (layout === 'horizontal') {
      return (
        <div
          id={id || instanceId}
          onClick={onClick}
          className={`flex items-center gap-2.5 select-none shrink-0 ${onClick ? 'cursor-pointer group' : ''} ${className}`}
        >
          <img
            src="/turflogo.png"
            alt="TurfBD Emblem"
            className="object-contain shrink-0 drop-shadow-xs transition-transform duration-200 group-hover:scale-105"
            style={{ width: currentSize.w, height: currentSize.h }}
            referrerPolicy="no-referrer"
          />
          <div className="text-left leading-none shrink-0">
            <div className="flex items-center gap-1.5">
              <span className={`tracking-tight font-black select-none ${currentSize.font}`}>
                <span className={variant === 'dark' ? 'text-white' : 'text-[#043D22] dark:text-emerald-100'}>Turf</span>
                <span className="text-[#00B050]">BD</span>
              </span>
              {showBadge && (
                <span className="text-[10px] uppercase font-extrabold bg-[#064E3B] text-white px-1.5 py-0.5 rounded tracking-wider shadow-2xs select-none">
                  {badgeText}
                </span>
              )}
            </div>
            {showTagline && (
              <p className={`${currentSize.subFont} text-[#475569] dark:text-slate-400 font-bold mt-1 tracking-[0.15em] uppercase select-none`}>
                {taglineText}
              </p>
            )}
          </div>
        </div>
      );
    }
  }

  // Icon only layout
  if (layout === 'icon' || layout === 'icon-only') {
    return (
      <div id={id || instanceId} className={`inline-flex items-center justify-center shrink-0 ${className}`} onClick={onClick}>
        {renderMark()}
      </div>
    );
  }

  // Vertical stacked layout (matching the official logo format)
  if (layout === 'vertical') {
    return (
      <div
        id={id || instanceId}
        onClick={onClick}
        className={`flex flex-col items-center text-center select-none shrink-0 ${onClick ? 'cursor-pointer group' : ''} ${className}`}
      >
        {renderMark('mb-2.5')}
        <div className="flex items-center gap-1 leading-none shrink-0">
          <span className={`tracking-tight font-black select-none ${currentSize.font}`}>
            <span className={variant === 'dark' ? 'text-white' : 'text-[#043D22] dark:text-emerald-100'}>Turf</span>
            <span className="text-[#00B050]">BD</span>
          </span>
          {showBadge && (
            <span className="text-[10px] uppercase font-extrabold bg-[#064E3B] text-white px-1.5 py-0.5 rounded ml-1 tracking-wider shadow-2xs select-none">
              {badgeText}
            </span>
          )}
        </div>
        {showTagline && (
          <p className={`${currentSize.subFont} text-[#334155] dark:text-slate-400 font-extrabold mt-1.5 tracking-[0.2em] uppercase select-none`}>
            {taglineText}
          </p>
        )}
      </div>
    );
  }

  // Default: Horizontal layout (shield on left, TurfBD wordmark and SPORTS badge on right)
  return (
    <div
      id={id || instanceId}
      onClick={onClick}
      className={`flex items-center gap-2.5 select-none shrink-0 ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      {renderMark()}
      <div className="text-left leading-none shrink-0 flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span className={`tracking-tight font-black select-none ${currentSize.font}`}>
            <span className={variant === 'dark' ? 'text-white' : 'text-[#043D22] dark:text-emerald-100'}>Turf</span>
            <span className="text-[#00B050]">BD</span>
          </span>
          {showBadge && (
            <span className="text-[10px] uppercase font-extrabold bg-[#064E3B] text-white px-1.5 py-0.5 rounded tracking-wider shadow-2xs select-none">
              {badgeText}
            </span>
          )}
        </div>
        {showTagline && (
          <p className={`${currentSize.subFont} text-[#475569] dark:text-slate-400 font-bold mt-1 tracking-[0.15em] uppercase select-none`}>
            {taglineText}
          </p>
        )}
      </div>
    </div>
  );
};
