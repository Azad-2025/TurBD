import React from 'react';
import { useApp } from '../context/AppContext';
import { Zap, Search, ArrowRight, ShieldCheck, PlusCircle } from 'lucide-react';

export const MobileHeroCard: React.FC = () => {
  const { setActiveTab } = useApp();

  const handleScrollToSlots = () => {
    const el = document.getElementById('mobile-turf-feed');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleListTurf = () => {
    setActiveTab('owner-dashboard');
  };

  return (
    <div
      id="mobile-hero-card"
      className="relative w-full rounded-3xl overflow-hidden shadow-lg border border-emerald-800/30 text-white min-h-[380px] flex flex-col justify-end p-5 my-2"
    >
      {/* Background Image: Natural football turf pitch with floodlights */}
      <img
        src="/hero.jpg"
        alt="Natural Football Turf Field with Floodlights"
        referrerPolicy="no-referrer"
        loading="eager"
        className="absolute inset-0 w-full h-full object-cover object-center transform scale-105"
        onError={(e) => {
          // Fallback to high-res Unsplash floodlit football pitch
          (e.target as HTMLImageElement).src =
            'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1080&q=80';
        }}
      />

      {/* Overlay: Soft green transparent gradient with premium sports atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#04281E]/95 via-[#064E3B]/75 to-[#064E3B]/25" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#04281E]/80 via-transparent to-transparent" />

      {/* Hero Content */}
      <div className="relative z-10 space-y-3.5">
        {/* Badge: "Real-Time Turf & Box Cricket in Bangladesh" */}
        <div className="inline-flex items-center gap-1.5 bg-emerald-500/25 border border-emerald-400/40 backdrop-blur-md text-emerald-200 text-[11px] font-bold px-3 py-1 rounded-full shadow-2xs">
          <Zap className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300 animate-pulse" />
          <span>Real-Time Turf & Box Cricket in Bangladesh</span>
        </div>

        {/* Heading: "Book Your Ground. Kickoff Tonight." */}
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-[1.15] drop-shadow-sm">
          Book Your Ground.
          <span className="block text-emerald-300">Kickoff Tonight.</span>
        </h1>

        {/* Description */}
        <p className="text-xs text-emerald-100/90 leading-relaxed max-w-xs drop-shadow-xs">
          Discover FIFA-standard football turfs and box cricket arenas across Bangladesh.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          {/* Primary Button */}
          <button
            onClick={handleScrollToSlots}
            className="w-full sm:w-auto py-3 px-5 bg-[#0FA958] hover:bg-[#0da052] active:bg-[#064E3B] text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-black/30 transition-all active:scale-98 cursor-pointer"
            id="mobile-hero-explore-btn"
          >
            <Search className="w-4 h-4 text-white" />
            <span>Explore Available Slots</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>

          {/* Secondary Button */}
          <button
            onClick={handleListTurf}
            className="w-full sm:w-auto py-2.5 px-4 bg-white/15 hover:bg-white/25 active:bg-white/30 backdrop-blur-md text-white font-bold rounded-2xl text-xs border border-white/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
            id="mobile-hero-list-btn"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-300" />
            <span>List Your Arena</span>
          </button>
        </div>
      </div>
    </div>
  );
};
