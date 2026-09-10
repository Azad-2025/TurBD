import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { TurfBDLogo } from './components/TurfBDLogo';
import { LoadingSplash } from './components/LoadingSplash';
import { SearchBar } from './components/SearchBar';
import { TurfCard } from './components/TurfCard';
import { TurfDetailModal } from './components/TurfDetailModal';
import { BookingModal } from './components/BookingModal';
import { AuthModal } from './components/AuthModal';
import { MyBookings } from './components/MyBookings';
import { OwnerDashboard } from './components/OwnerDashboard';
import { AdminPanel } from './components/AdminPanel';
import {
  Compass,
  MapPin,
  Calendar,
  ShieldCheck,
  Zap,
  PhoneCall,
  RotateCcw,
} from 'lucide-react';

const MainApp: React.FC = () => {
  const {
    activeTab,
    turfs,
    searchFilters,
    resetFilters,
    selectedTurf,
    bookingTurf,
    setBookingTurf,
  } = useApp();

  // Filter approved turfs for players/browsers
  const filteredTurfs = turfs.filter((t) => {
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

    // Price filter
    if (t.hourlyRate > searchFilters.maxPrice) {
      return false;
    }

    return true;
  });

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (isInitialLoading) {
    return <LoadingSplash message="Loading TurfBD Sports Arenas..." />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Global Navigation Header */}
      <Navbar />

      {/* Main Content View Switcher */}
      <main className="flex-1">
        {activeTab === 'browse' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
            {/* Header Hero Banner */}
            <div className="relative rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800 p-6 sm:p-10 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/50 via-neutral-900/90 to-neutral-950/70 pointer-events-none" />
              <div className="relative z-10 max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Real-Time Turf & Box Cricket Slots in Bangladesh</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                  Book Your Ground. <br />
                  <span className="text-emerald-400">Kickoff Tonight.</span>
                </h1>
                <p className="text-sm text-neutral-300 leading-relaxed max-w-xl">
                  Discover FIFA-standard football turfs and box cricket arenas across Dhaka, Chattogram, and Sylhet. Reserve hourly slots with instant bKash or Nagad advance tokens.
                </p>
              </div>

              {/* Quick stats floating badge */}
              <div className="relative z-10 grid grid-cols-3 gap-3 sm:gap-6 pt-6 mt-6 border-t border-neutral-800/80 max-w-lg">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">15+</div>
                  <div className="text-[11px] text-neutral-400">Verified Arenas</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">06:00 - 02:00</div>
                  <div className="text-[11px] text-neutral-400">Floodlit Slots</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">৳1,000</div>
                  <div className="text-[11px] text-neutral-400">Instant Advance Token</div>
                </div>
              </div>
            </div>

            {/* Search & Filter Component */}
            <section id="search-section">
              <SearchBar />
            </section>

            {/* Turf Listings Grid */}
            <section className="space-y-4" id="turf-listings-section">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Available Sports Turfs
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Showing <strong className="text-emerald-400">{filteredTurfs.length}</strong> live arenas in Bangladesh
                  </p>
                </div>

                {filteredTurfs.length < turfs.filter(t => t.status === 'approved').length && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-neutral-400 hover:text-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Filters</span>
                  </button>
                )}
              </div>

              {filteredTurfs.length === 0 ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-800 text-neutral-500 flex items-center justify-center mx-auto">
                    <Compass className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">No matching arenas found</h3>
                    <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                      Try broadening your search criteria, selecting &quot;All Cities&quot;, or raising your maximum price limit.
                    </p>
                  </div>
                  <button
                    onClick={resetFilters}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Reset Search Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTurfs.map((turf) => (
                    <TurfCard key={turf.id} turf={turf} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'my-bookings' && <MyBookings />}
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

      {/* Footer */}
      <footer className="mt-16 bg-neutral-900 border-t border-neutral-800 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3 md:col-span-1">
              <TurfBDLogo
                layout="horizontal"
                size="md"
                variant="dark"
                id="footer-turfbd-logo"
              />
              <p className="text-xs text-neutral-400 leading-relaxed">
                Bangladesh’s dedicated sports arena booking platform. Find pitches, book slots, and play with peace of mind.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider mb-3">Popular Locations</h4>
              <ul className="space-y-1.5 text-xs text-neutral-400">
                <li>Gulshan & Banani Arenas</li>
                <li>Dhanmondi Football Turfs</li>
                <li>Mirpur DOHS Cage Grounds</li>
                <li>Uttara Dual-Pitch Sports Zones</li>
                <li>Chattogram GEC Turfs</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider mb-3">Sports Covered</h4>
              <ul className="space-y-1.5 text-xs text-neutral-400">
                <li>⚽ 7-a-side Football</li>
                <li>🏏 Box Cricket & Tape Ball</li>
                <li>🥅 5v5 Futsal Cages</li>
                <li>🏸 Indoor Badminton Courts</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider mb-3">Supported Payments</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-pink-400 font-bold text-[10px]">
                  🌸 bKash
                </span>
                <span className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-orange-400 font-bold text-[10px]">
                  🟠 Nagad
                </span>
                <span className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-purple-400 font-bold text-[10px]">
                  🟣 Rocket
                </span>
                <span className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-emerald-400 font-bold text-[10px]">
                  💵 Cash on Field
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Hotline & WhatsApp Support: <strong className="text-white">+880 1711-TURFBD</strong>
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-400">
            <div>
              © {new Date().getFullYear()} TurfBD. Bangladesh’s Sports Turf Booking Network.
            </div>
            <div className="flex items-center gap-4">
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Booking</span>
              <span>•</span>
              <span>Turf Owner Agreement</span>
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
