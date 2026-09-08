import React from 'react';
import { Turf } from '../types';
import { useApp } from '../context/AppContext';
import { MapPin, Star, ShieldCheck, Clock, Zap, ArrowRight } from 'lucide-react';

interface TurfCardProps {
  turf: Turf;
}

export const TurfCard: React.FC<TurfCardProps> = ({ turf }) => {
  const { setSelectedTurf, setBookingTurf } = useApp();

  return (
    <div
      className="group bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-950/20 flex flex-col"
      id={`turf-card-${turf.id}`}
    >
      {/* Turf Image & Badges */}
      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-neutral-800">
        <img
          src={turf.images[0] || 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80'}
          alt={turf.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-black/20" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5">
            {turf.isFeatured && (
              <span className="bg-amber-500/90 backdrop-blur text-neutral-950 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center gap-1 shadow">
                <Zap className="w-3 h-3 fill-current" /> Featured
              </span>
            )}
            <span className="bg-neutral-900/80 backdrop-blur text-neutral-200 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-neutral-700/60">
              {turf.size}
            </span>
          </div>

          <div className="bg-neutral-900/90 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded-lg border border-neutral-700/60 flex items-center gap-1 shadow">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>{turf.rating > 0 ? turf.rating.toFixed(1) : 'New'}</span>
            {turf.reviewCount > 0 && (
              <span className="text-[10px] text-neutral-400 font-normal">({turf.reviewCount})</span>
            )}
          </div>
        </div>

        {/* Bottom Location Overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-neutral-300">
          <div className="flex items-center gap-1 bg-neutral-900/70 backdrop-blur px-2 py-0.5 rounded-md border border-neutral-800/80">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-white">{turf.area}</span>, {turf.city}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-neutral-300 bg-neutral-900/70 backdrop-blur px-2 py-0.5 rounded-md border border-neutral-800/80">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span>{turf.openingTime} - {turf.closingTime}</span>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3
              onClick={() => setSelectedTurf(turf)}
              className="text-base font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer"
            >
              {turf.name}
            </h3>
          </div>

          <p className="text-xs text-neutral-400 line-clamp-2 mb-3 leading-relaxed">
            {turf.tagline || turf.description}
          </p>

          {/* Sports Types */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {turf.sports.map((sp) => (
              <span
                key={sp}
                className="text-[10px] font-semibold uppercase tracking-wider bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700/60"
              >
                {sp === 'football' ? '⚽ Football' : sp === 'cricket' ? '🏏 Cricket' : sp === 'badminton' ? '🏸 Badminton' : '🥅 Futsal'}
              </span>
            ))}
            <span className="text-[10px] font-medium bg-emerald-950/40 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/40">
              {turf.surface.split(' ')[0]} Grass
            </span>
          </div>

          {/* Amenities chips */}
          <div className="flex flex-wrap gap-1 text-[11px] text-neutral-400 mb-4">
            {turf.amenities.slice(0, 3).map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-neutral-800/50 px-2 py-0.5 rounded text-[10px]">
                <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                {a}
              </span>
            ))}
            {turf.amenities.length > 3 && (
              <span className="text-[10px] text-neutral-400 font-mono py-0.5">
                +{turf.amenities.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Pricing & Booking Button Footer */}
        <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Hourly Rate</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-emerald-400 font-mono">৳{turf.hourlyRate.toLocaleString()}</span>
              <span className="text-xs text-neutral-400">/hr</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedTurf(turf)}
              className="px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-xl transition-colors cursor-pointer"
              id={`view-details-${turf.id}`}
            >
              Details
            </button>
            <button
              onClick={() => setBookingTurf(turf)}
              className="px-4 py-2 text-xs font-bold text-neutral-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1 cursor-pointer"
              id={`book-turf-${turf.id}`}
            >
              <span>Book Slot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
