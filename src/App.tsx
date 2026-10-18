import React, { useState, useEffect, useMemo } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { TurfBDLogo } from './components/TurfBDLogo';
import { HeroSection } from './components/HeroSection';
import { LoadingSplash } from './components/LoadingSplash';
import { SearchBar } from './components/SearchBar';
import { LocationDetector } from './components/LocationDetector';
import { TurfMap } from './components/TurfMap';
import { AIMatchAssistant } from './components/AIMatchAssistant';
import { TurfCard } from './components/TurfCard';
import { TurfDetailModal } from './components/TurfDetailModal';
import { BookingModal } from './components/BookingModal';
import { AuthModal } from './components/AuthModal';
import { MyBookings } from './components/MyBookings';
import { OwnerDashboard } from './components/OwnerDashboard';
import { AdminPanel } from './components/AdminPanel';
import { BottomNav } from './components/BottomNav';
import { ProfileView } from './components/ProfileView';
import { MobileAppHeader } from './components/MobileAppHeader';
import { MobileCategoryNav } from './components/MobileCategoryNav';
import { MobileHeroCard } from './components/MobileHeroCard';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import {
  Compass,
  MapPin,
  Calendar,
  ShieldCheck,
  Zap,
  PhoneCall,
  RotateCcw,
  WifiOff,
  Sparkles,
  Flame,
  Layers,
} from 'lucide-react';
import { calculateDistanceKm, formatDistance, estimateDriveTimeMinutes } from './utils/geo';

const MainApp: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    previewRole,
    setPreviewRole,
    turfs,
    searchFilters,
    setSearchFilters,
    resetFilters,
    selectedTurf,
    bookingTurf,
    setBookingTurf,
  } = useApp();

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Filter approved turfs, compute distances, and apply sorting
  const filteredTurfs = useMemo(() => {
    const list = turfs.filter((t) => {
      // Only approved turfs appear in general browse
      if (t.status !== 'approved') return false;

      // Search query filter
      if (searchFilters.query.trim()) {
        const q = searchFilters.query.toLowerCase();
        const matchName = t.name.toLowerCase().includes(q);
        const matchArea = t.area.toLowerCase().includes(q);
        const matchCity = t.city.toLowerCase().includes(q);
        const matchDesc = t.description.toLowerCase().includes(q);
        if (!matchName && !matchArea && !matchCity && !matchDesc) return false;
      }

      // City filter
      if (searchFilters.city !== 'All Cities' && t.city !== searchFilters.city) {
        return false;
      }

      // Area filter
      if (searchFilters.area !== 'All Areas' && t.area !== searchFilters.area) {
        return false;
      }

      // Sport filter
      if (searchFilters.sport !== 'all') {
        if (!t.sports.includes(searchFilters.sport as any)) return false;
      }

      // Venue type filter (Indoor / Outdoor / Rooftop)
      if (searchFilters.venueType && searchFilters.venueType !== 'all') {
        if (t.venueType !== searchFilters.venueType) return false;
      }

      // Verified Badge filter
      if (searchFilters.badge === 'gold_partner') {
        if (t.verifiedBadge !== 'gold_partner') return false;
      } else if (searchFilters.badge === 'turfbd_verified' || searchFilters.verifiedOnly) {
        if (t.verifiedBadge !== 'gold_partner' && t.verifiedBadge !== 'turfbd_verified') return false;
      }

      // Price filter
      if (t.hourlyRate > searchFilters.maxPrice) {
        return false;
      }

      return true;
    });

    // Distance calculation
    const userLoc = searchFilters.userLocation;
    const enrichedList = list.map((turf) => {
      if (userLoc && turf.latitude && turf.longitude) {
        const distKm = calculateDistanceKm(userLoc.latitude, userLoc.longitude, turf.latitude, turf.longitude);
        return {
          ...turf,
          distanceKm: distKm,
          distanceFormatted: formatDistance(distKm),
          driveTimeMinutes: estimateDriveTimeMinutes(distKm),
        };
      }
      return turf;
    });

    // Proximity radius filter
    let finalFiltered = enrichedList;
    if (userLoc && searchFilters.maxDistanceKm && searchFilters.maxDistanceKm < 100) {
      finalFiltered = finalFiltered.filter(
        (t) => (t.distanceKm !== undefined ? t.distanceKm <= searchFilters.maxDistanceKm! : true)
      );
    }

    // Sorting
    finalFiltered.sort((a, b) => {
      if (searchFilters.sortBy === 'distance') {
        return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
      }
      if (searchFilters.sortBy === 'price_asc') {
        return a.hourlyRate - b.hourlyRate;
      }
      if (searchFilters.sortBy === 'price_desc') {
        return b.hourlyRate - a.hourlyRate;
      }
      if (searchFilters.sortBy === 'rating') {
        return b.rating - a.rating;
      }
      // default: recommended (featured first, then gold partner, then rating)
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      if (a.verifiedBadge === 'gold_partner' && b.verifiedBadge !== 'gold_partner') return -1;
      if (b.verifiedBadge === 'gold_partner' && a.verifiedBadge !== 'gold_partner') return 1;
      return b.rating - a.rating;
    });

    return finalFiltered;
  }, [turfs, searchFilters]);

  const featuredTurfs = turfs.filter((t) => t.status === 'approved' && t.isFeatured);

  const sportCategories = [
    { id: 'all', label: 'All Arenas', emoji: '⚡' },
    { id: 'football', label: 'Football', emoji: '⚽' },
    { id: 'cricket', label: 'Box Cricket', emoji: '🏏' },
    { id: 'futsal', label: 'Futsal', emoji: '🥅' },
    { id: 'badminton', label: 'Badminton', emoji: '🏸' },
  ];

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (isInitialLoading) {
    return <LoadingSplash message="Loading TurfBD Sports Arenas..." />;
  }

  return (
    <div className="min-h-screen bg-[#F7FAF8] dark:bg-[#060D0A] text-[#0F172A] dark:text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Offline Status Warning Bar for PWA */}
      {!isOnline && (
        <div className="bg-amber-500 text-neutral-950 px-3 py-1.5 text-xs font-bold text-center flex items-center justify-center gap-1.5 sticky top-[env(safe-area-inset-top,0px)] z-50 shadow-md">
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are currently offline. Showing cached turf slots and bookings.</span>
        </div>
      )}

      {/* Super Admin Safe Interface Preview Banner */}
      {previewRole && currentUser?.isSuperAdmin && (
        <div className="bg-purple-950 text-white px-4 py-2.5 text-xs font-semibold flex flex-wrap items-center justify-between gap-3 border-b border-purple-800 shadow-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-purple-700 text-purple-100 font-mono font-bold text-[10px] uppercase rounded">
              Super Admin Preview
            </span>
            <span>
              Simulating <strong className="underline uppercase tracking-wide">{previewRole === 'customer' ? 'Customer / Player' : 'Turf Owner'}</strong> Interface
            </span>
            <span className="text-purple-300 text-[11px] hidden sm:inline">
              (Read-only UI preview. Your actual database role remains Super Admin.)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {previewRole === 'customer' ? (
              <button
                onClick={() => {
                  setPreviewRole('owner');
                }}
                className="px-2.5 py-1 bg-purple-800 hover:bg-purple-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                Switch to Owner Preview →
              </button>
            ) : (
              <button
                onClick={() => {
                  setPreviewRole('customer');
                }}
                className="px-2.5 py-1 bg-purple-800 hover:bg-purple-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                Switch to Customer Preview →
              </button>
            )}
            <button
              onClick={() => {
                setPreviewRole(null);
              }}
              className="px-3 py-1 bg-white hover:bg-purple-100 text-purple-950 font-black text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Exit Preview ✕
            </button>
          </div>
        </div>
      )}

      {/* Global Navigation Header */}
      <Navbar />

      {/* Category Navigation (Horizontal scrolling tabs directly below header on mobile) */}
      <div className="block md:hidden">
        <MobileCategoryNav />
      </div>

      {/* Main Content View Switcher */}
      <main className="flex-1 pb-24 md:pb-8">
        {(activeTab === 'browse' || activeTab === 'home') && (
          <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-2 sm:py-8 space-y-2.5 sm:space-y-8">
            {/* PWA Install Banner */}
            <PWAInstallBanner />

            {/* Desktop Sport Filter Pills (Hidden on mobile since MobileCategoryNav is active) */}
            <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
              {sportCategories.map((cat) => {
                const isCatActive = searchFilters.sport === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() =>
                      setSearchFilters({
                        ...searchFilters,
                        sport: cat.id,
                      })
                    }
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer shrink-0 border ${
                      isCatActive
                        ? 'bg-[#0FA958] text-white border-[#0FA958] shadow-sm shadow-[#0FA958]/20'
                        : 'bg-white dark:bg-[#0E1A1A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Desktop Hero Section (>= 768px) */}
            <div className="hidden md:block">
              <HeroSection />
            </div>

            {/* AI Pitch Matchmaker & Search Section (Desktop and Tablet) */}
            <section id="search-section" className="hidden md:block space-y-4">
              <AIMatchAssistant />
              <LocationDetector />
              <SearchBar />
            </section>

            {/* Turf Discovery Listings Section (Split, Map, or Grid View) */}
            <section className="space-y-4" id="mobile-turf-feed">
              {filteredTurfs.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 shadow-card">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                    <Compass className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">No matching arenas found</h3>
                    <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
                      Try widening your search radius, selecting &quot;All Cities&quot;, or raising your maximum price limit.
                    </p>
                  </div>
                  <button
                    onClick={resetFilters}
                    className="px-5 py-2.5 bg-[#0FA958] hover:bg-[#0da052] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm shadow-[#0FA958]/20"
                  >
                    Reset Search Filters
                  </button>
                </div>
              ) : (searchFilters.viewMode || 'split') === 'map' ? (
                <div className="space-y-4">
                  <TurfMap turfs={filteredTurfs} height="600px" />
                </div>
              ) : (searchFilters.viewMode || 'split') === 'split' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Sticky Map Radar */}
                  <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-20 order-2 lg:order-1">
                    <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-card">
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1 text-xs text-[#64748B]">
                        <span className="font-bold text-[#0F172A] flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#0FA958]" />
                          <span>Interactive Arena Radar</span>
                        </span>
                        <span className="text-[10px] text-[#064E3B] font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {filteredTurfs.length} pins
                        </span>
                      </div>
                      <TurfMap turfs={filteredTurfs} height="480px" />
                    </div>
                  </div>

                  {/* Listings Grid */}
                  <div className="lg:col-span-7 xl:col-span-7 order-1 lg:order-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      {filteredTurfs.map((turf, idx) => (
                        <TurfCard
                          key={turf.id}
                          turf={turf}
                          index={idx}
                          totalCount={filteredTurfs.length}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredTurfs.map((turf, idx) => (
                    <TurfCard
                      key={turf.id}
                      turf={turf}
                      index={idx}
                      totalCount={filteredTurfs.length}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Dedicated AI Pitch Matchmaker Tab for Mobile BottomNav */}
        {activeTab === 'ai' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-[#064E3B] text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#0FA958] animate-pulse" />
                <span>Powered by Gemini Intelligence</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                AI Sports Turf Advisor
              </h1>
              <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto">
                Find the right pitch for your 5v5 squad, corporate tape-ball tournament, or late-night floodlit session anywhere in Bangladesh.
              </p>
            </div>

            <AIMatchAssistant />

            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Popular Match Queries in Dhaka
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#0F172A]">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-bold text-[#0F172A] block mb-0.5">🏟️ Best 7v7 in Dhanmondi</span>
                  <p className="text-[11px] text-[#64748B]">FIFA standard turf with bibs, lockers, and floodlights under 2,800 BDT/hr</p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-bold text-[#0F172A] block mb-0.5">🏏 Box Cricket in Uttara</span>
                  <p className="text-[11px] text-[#64748B]">Tape-ball pitch with protective netting and scoreboard</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Explore Tab with Radar Map & Location Discovery */}
        {activeTab === 'explore' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <div>
              <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Explore &amp; Discover Turfs</h1>
              <p className="text-xs text-[#64748B] mt-1">
                Pinpoint turfs on Google Maps radar, filter by indoor cage or rooftop, and discover venues nearest to your location.
              </p>
            </div>

            <LocationDetector />
            <SearchBar />

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#64748B]">
                  Showing <strong className="text-[#064E3B]">{filteredTurfs.length}</strong> venues
                  {searchFilters.userLocation && (
                    <span> • Near {searchFilters.userLocation.name}</span>
                  )}
                </span>
                {filteredTurfs.length < turfs.filter((t) => t.status === 'approved').length && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-[#64748B] hover:text-[#0FA958] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Split or Grid Layout */}
              {(searchFilters.viewMode || 'split') === 'map' ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-card">
                  <TurfMap turfs={filteredTurfs} height="620px" />
                </div>
              ) : (searchFilters.viewMode || 'split') === 'split' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-5 sticky top-20 order-2 lg:order-1">
                    <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-card">
                      <TurfMap turfs={filteredTurfs} height="520px" />
                    </div>
                  </div>
                  <div className="lg:col-span-7 order-1 lg:order-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredTurfs.map((turf) => (
                        <TurfCard key={turf.id} turf={turf} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredTurfs.map((turf) => (
                    <TurfCard key={turf.id} turf={turf} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'my-bookings' && <MyBookings />}
        {activeTab === 'profile' && <ProfileView />}
        {activeTab === 'owner-dashboard' && <OwnerDashboard />}
        {activeTab === 'admin-panel' && <AdminPanel />}
      </main>

      {/* Global Modals */}
      <AuthModal />
      <TurfDetailModal />
      {bookingTurf && (
        <BookingModal
          turf={bookingTurf}
          onClose={() => setBookingTurf(null)}
        />
      )}

      {/* Mobile App Bottom Navigation (Phase 2) */}
      <BottomNav />

      {/* Footer */}
      <footer className="mt-16 bg-white border-t border-slate-200 text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3 md:col-span-1">
              <TurfBDLogo
                layout="horizontal"
                size="md"
                variant="light"
                id="footer-turfbd-logo"
              />
              <p className="text-xs text-[#64748B] leading-relaxed">
                Bangladesh’s dedicated sports arena booking platform. Find pitches, book slots, and play with peace of mind.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-[#0F172A] uppercase text-[11px] tracking-wider mb-3">Popular Locations</h4>
              <ul className="space-y-1.5 text-xs text-[#64748B]">
                <li className="hover:text-[#0FA958] transition-colors cursor-pointer">Gulshan & Banani Arenas</li>
                <li className="hover:text-[#0FA958] transition-colors cursor-pointer">Dhanmondi Football Turfs</li>
                <li className="hover:text-[#0FA958] transition-colors cursor-pointer">Mirpur DOHS Cage Grounds</li>
                <li className="hover:text-[#0FA958] transition-colors cursor-pointer">Uttara Dual-Pitch Sports Zones</li>
                <li className="hover:text-[#0FA958] transition-colors cursor-pointer">Chattogram GEC Turfs</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-[#0F172A] uppercase text-[11px] tracking-wider mb-3">Sports Covered</h4>
              <ul className="space-y-1.5 text-xs text-[#64748B]">
                <li>⚽ 7-a-side Football</li>
                <li>🏏 Box Cricket & Tape Ball</li>
                <li>🥅 5v5 Futsal Cages</li>
                <li>🏸 Indoor Badminton Courts</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-[#0F172A] uppercase text-[11px] tracking-wider mb-3">Supported Payments</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2 py-1 bg-pink-50 border border-pink-200 rounded text-pink-700 font-bold text-[10px]">
                  🌸 bKash
                </span>
                <span className="px-2 py-1 bg-orange-50 border border-orange-200 rounded text-orange-700 font-bold text-[10px]">
                  🟠 Nagad
                </span>
                <span className="px-2 py-1 bg-purple-50 border border-purple-200 rounded text-purple-700 font-bold text-[10px]">
                  🟣 Rocket
                </span>
                <span className="px-2 py-1 bg-emerald-50 border border-emerald-200 rounded text-[#064E3B] font-bold text-[10px]">
                  💵 Cash on Field
                </span>
              </div>
              <p className="text-[11px] text-[#64748B]">
                Hotline & WhatsApp Support: <strong className="text-[#0F172A]">+880 1711-TURFBD</strong>
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#64748B]">
            <div>
              © {new Date().getFullYear()} TurfBD. Bangladesh’s Sports Turf Booking Network.
            </div>
            <div className="flex items-center gap-4">
              <span className="hover:text-[#0FA958] cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-[#0FA958] cursor-pointer">Terms of Booking</span>
              <span>•</span>
              <span className="hover:text-[#0FA958] cursor-pointer">Turf Owner Agreement</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
