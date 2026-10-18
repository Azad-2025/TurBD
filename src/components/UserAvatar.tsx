import React, { useState } from 'react';
import { User as UserIcon } from 'lucide-react';

interface UserAvatarProps {
  name?: string;
  avatar?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  shape?: 'circle' | 'rounded';
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base font-bold',
  xl: 'w-20 h-20 text-xl font-extrabold',
};

const iconSizes = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
  xl: 'w-10 h-10',
};

// Deterministic pleasing background color palette based on name hash
const BG_PALETTES = [
  'bg-emerald-600 text-white',
  'bg-teal-600 text-white',
  'bg-blue-600 text-white',
  'bg-indigo-600 text-white',
  'bg-slate-700 text-white',
  'bg-amber-600 text-white',
];

function getInitials(name?: string): string {
  if (!name || !name.trim()) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getPalette(name?: string): string {
  if (!name) return BG_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % BG_PALETTES.length;
  return BG_PALETTES[index];
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name = '',
  avatar = null,
  size = 'md',
  className = '',
  shape = 'circle',
}) => {
  const [imageError, setImageError] = useState(false);

  const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const initials = getInitials(name);
  const paletteClass = getPalette(name);

  // If valid image provided and hasn't errored
  if (avatar && !imageError) {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden ${roundedClass} ${sizeClass} ${className} bg-slate-100`}
      >
        <img
          src={avatar}
          alt={name ? `${name}'s avatar` : 'User avatar'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback: Deterministic Initials or Neutral Icon
  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 font-bold select-none ${roundedClass} ${sizeClass} ${paletteClass} ${className}`}
      title={name || 'User'}
    >
      {initials ? (
        <span>{initials}</span>
      ) : (
        <UserIcon className={iconSizes[size] || iconSizes.md} />
      )}
    </div>
  );
};
