import React, { useState } from 'react';
import {
  Zap,
  ArrowRight,
  MapPin,
  Trophy,
  Flame,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const HeroSection: React.FC = () => {
  const { setActiveTab } = useApp();
  const [videoError, setVideoError] = useState(false);

  const handleScrollToSearch = () => {
    const el = document.getElementById('search-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleListTurf = () => {
    setActiveTab('owner');
  };

  return (
    <div
      id="hero-section"
      className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-card transition-all"
    >
      {/* Background ambient natural green glow */}
      <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-green-50/60 rounded-full blur-3xl pointer-events-none" />

      {/* Main Split Grid Layout */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* =========================================================================
            LEFT COLUMN: Badge, Headline, Value Props, Stats, CTAs
           ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-10 lg:p-12 space-y-6 sm:space-y-8">
          <div className="space-y-4 sm:space-y-5">
            {/* Live Indicator & Status Badge */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-[#064E3B] text-[11px] sm:text-xs font-bold px-3 py-1.5 rounded-full shadow-2xs">
                <Zap className="w-3.5 h-3.5 text-[#0FA958] fill-[#0FA958]" />
                <span>Real-Time Turf & Box Cricket in Bangladesh</span>
              </div>

              <div className="hidden sm:inline-flex items-center gap-1.5 bg-slate-100/80 border border-slate-200 text-slate-600 text-[11px] px-2.5 py-1 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0FA958]" />
                <span>Dhaka • Ctg • Sylhet</span>
              </div>
            </div>

            {/* Core Heading */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0F172A] tracking-tight leading-[1.08]">
                Book Your Ground.{' '}
                <span className="block text-[#064E3B]">
                  Kickoff Tonight.
                </span>
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-[#64748B] leading-relaxed max-w-xl pt-1">
                Discover FIFA-standard football turfs and box cricket arenas across Dhaka, Chattogram, and Sylhet. Filter by indoor cages, rooftop pitches, live proximity, and verified partner arenas.
              </p>
            </div>

            {/* Call to Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={handleScrollToSearch}
                className="px-6 py-3.5 bg-[#0FA958] hover:bg-[#0da052] text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-[#0FA958]/25 hover:shadow-lg hover:shadow-[#0FA958]/35 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                id="hero-explore-slots-btn"
              >
                <Search className="w-4 h-4 text-white" />
                <span>Explore Available Slots</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>

              <button
                onClick={handleListTurf}
                className="px-5 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-2xl text-xs sm:text-sm border border-slate-200 hover:border-slate-300 transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
                id="hero-list-turf-btn"
              >
                <span>List Your Arena</span>
                <span className="text-[10px] bg-emerald-100 text-[#064E3B] border border-emerald-300/80 px-1.5 py-0.5 rounded font-mono font-bold">
                  Owner OS
                </span>
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-5 border-t border-slate-100">
            <div>
              <div className="flex items-center gap-1.5 text-lg sm:text-2xl font-black text-[#0F172A] font-mono">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-[#0FA958] shrink-0" />
                <span>15+</span>
              </div>
              <div className="text-[10px] sm:text-xs text-[#64748B] mt-0.5">Verified Arenas</div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-lg sm:text-2xl font-black text-[#064E3B] font-mono">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#0FA958] shrink-0" />
                <span>06:00 - 02:00</span>
              </div>
              <div className="text-[10px] sm:text-xs text-[#64748B] mt-0.5">Floodlit Slots</div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-lg sm:text-2xl font-black text-[#0F172A] font-mono">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
                <span>৳1,000</span>
              </div>
              <div className="text-[10px] sm:text-xs text-[#64748B] mt-0.5">Advance Token</div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: Cinematic Sports Hero Media Container with Floating Badges
           ========================================================================= */}
        <div className="lg:col-span-5 relative w-full h-80 sm:h-96 lg:h-auto min-h-[360px] sm:min-h-[420px] lg:min-h-[500px] overflow-hidden lg:rounded-r-3xl flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="absolute inset-0 z-0 overflow-hidden">
            {/* Optional HTML5 Video with graceful fallback to Ken Burns Picture Image */}
            {!videoError && (
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                onError={() => setVideoError(true)}
                poster="/hero.jpg"
                className="w-full h-full object-cover object-center transform scale-105 filter brightness-100 contrast-105"
              >
                <source src="/hero.mp4" type="video/mp4" />
                <source src="/hero.webm" type="video/webm" />
              </video>
            )}

            {/* High-definition WebP / JPG Image with Ken Burns animation */}
            <picture className={videoError ? 'block w-full h-full' : 'hidden'}>
              <source srcSet="/images/turf_hero_banner.jpg" type="image/jpeg" />
              <source srcSet="/hero.jpg" type="image/jpeg" />
              <img
                src="/hero.jpg"
                alt="Night football turf in Dhaka with floodlights and active players"
                width={1200}
                height={800}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover object-center transform animate-hero-ken-burns filter brightness-100 contrast-105"
                referrerPolicy="no-referrer"
              />
            </picture>

            {/* Natural gradient overlays for readability and soft depth */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/70 via-transparent to-transparent pointer-events-none hidden lg:block" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* =======================================================================
              FLOATING UI ELEMENTS OVER CINEMATIC MEDIA
             ======================================================================= */}
          <div className="relative z-20 w-full h-full flex flex-col justify-between pointer-events-none">
            {/* Top Right: Location Badge */}
            <div className="flex justify-end pt-1 pr-1">
              <div className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 text-[#0F172A] shadow-soft animate-hero-float-slow">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0FA958] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0FA958]" />
                </span>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#0FA958]" />
                  <span>Dhaka, Bangladesh</span>
                </span>
              </div>
            </div>

            {/* Bottom Right: "Book. Play. Repeat." Healthier, Happier You Card */}
            <div className="flex justify-end pb-1 pr-1">
              <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3.5 shadow-card animate-hero-float-slow max-w-[260px] sm:max-w-[280px]">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#064E3B] shadow-2xs shrink-0">
                    <Trophy className="w-4 h-4 text-[#064E3B] stroke-[2.5]" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-black text-[#0F172A] tracking-tight">
                      Book. Play. Repeat.
                    </div>
                    <div className="text-[11px] text-[#0FA958] font-semibold leading-tight">
                      A healthier, happier you
                    </div>
                    <div className="text-[9px] text-[#64748B] flex items-center gap-1 pt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-[#0FA958] shrink-0" />
                      <span>Instant 1-Click bKash Advance</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default HeroSection;
