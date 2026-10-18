import React from 'react';
import {
  Home,
  Compass,
  CalendarCheck2,
  User as UserIcon,
  ShieldAlert,
  LayoutDashboard,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, currentUser, bookings, setIsAuthModalOpen } = useApp();

  // Active bookings count for badge
  const myActiveBookingsCount = currentUser
    ? bookings.filter(
        (b) =>
          b.userId === currentUser.id &&
          (b.status === 'confirmed' || b.status === 'pending_approval')
      ).length
    : 0;

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate?.(10);
      } catch {
        // Ignore
      }
    }
  };

  const handleTabClick = (tab: 'home' | 'explore' | 'my-bookings' | 'profile') => {
    triggerHaptic();

    if (tab === 'profile' && !currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    setActiveTab(tab as any);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isHomeActive = activeTab === 'browse' || (activeTab as string) === 'home';
  const isExploreActive = (activeTab as string) === 'explore';
  const isBookingsActive = activeTab === 'my-bookings';
  const isProfileActive = (activeTab as string) === 'profile';

  return (
    <nav
      id="turfbd-mobile-bottom-nav"
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-[#0B1315]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[max(6px,env(safe-area-inset-bottom,0px))] transition-colors"
    >
      {/* Role shortcut banner if user is owner or admin */}
      {currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin') && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-100 dark:border-emerald-900/50 px-4 py-1.5 flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300">
          <span className="flex items-center gap-1.5 font-semibold">
            {currentUser.role === 'admin' ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Super Admin</span>
              </>
            ) : (
              <>
                <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Turf Owner</span>
              </>
            )}
          </span>
          <button
            onClick={() =>
              setActiveTab(currentUser.role === 'admin' ? 'admin-panel' : 'owner-dashboard')
            }
            className="text-[#0FA958] font-bold hover:underline"
          >
            Dashboard →
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 h-[60px] max-w-md mx-auto px-2 items-center">
        {/* Tab 1: Home */}
        <button
          id="mobile-nav-home-btn"
          onClick={() => handleTabClick('home')}
          className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer active:scale-95 ${
            isHomeActive
              ? 'text-[#0FA958]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Home
            className={`w-5 h-5 transition-transform ${
              isHomeActive ? 'text-[#0FA958] stroke-[2.5]' : 'stroke-2'
            }`}
          />
          <span
            className={`text-[10px] mt-1 tracking-tight ${
              isHomeActive ? 'font-bold text-[#0FA958]' : 'font-medium text-slate-500 dark:text-slate-400'
            }`}
          >
            Home
          </span>
        </button>

        {/* Tab 2: Explore */}
        <button
          id="mobile-nav-explore-btn"
          onClick={() => handleTabClick('explore')}
          className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer active:scale-95 ${
            isExploreActive
              ? 'text-[#0FA958]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Compass
            className={`w-5 h-5 transition-transform ${
              isExploreActive ? 'text-[#0FA958] stroke-[2.5]' : 'stroke-2'
            }`}
          />
          <span
            className={`text-[10px] mt-1 tracking-tight ${
              isExploreActive ? 'font-bold text-[#0FA958]' : 'font-medium text-slate-500 dark:text-slate-400'
            }`}
          >
            Explore
          </span>
        </button>

        {/* Tab 3: My Booking */}
        <button
          id="mobile-nav-bookings-btn"
          onClick={() => handleTabClick('my-bookings')}
          className={`flex flex-col items-center justify-center h-full transition-colors relative cursor-pointer active:scale-95 ${
            isBookingsActive
              ? 'text-[#0FA958]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <CalendarCheck2
              className={`w-5 h-5 transition-transform ${
                isBookingsActive ? 'text-[#0FA958] stroke-[2.5]' : 'stroke-2'
              }`}
            />
            {myActiveBookingsCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-[#0FA958] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {myActiveBookingsCount}
              </span>
            )}
          </div>
          <span
            className={`text-[10px] mt-1 tracking-tight ${
              isBookingsActive ? 'font-bold text-[#0FA958]' : 'font-medium text-slate-500 dark:text-slate-400'
            }`}
          >
            My Booking
          </span>
        </button>

        {/* Tab 4: Profile */}
        <button
          id="mobile-nav-profile-btn"
          onClick={() => handleTabClick('profile')}
          className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer active:scale-95 ${
            isProfileActive
              ? 'text-[#0FA958]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {currentUser?.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-5 h-5 rounded-full object-cover ring-2 ring-[#0FA958]"
            />
          ) : (
            <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center">
              <UserIcon
                className={`w-3.5 h-3.5 ${
                  isProfileActive ? 'text-[#0FA958]' : 'text-slate-500 dark:text-slate-400'
                }`}
              />
            </div>
          )}
          <span
            className={`text-[10px] mt-1 tracking-tight ${
              isProfileActive ? 'font-bold text-[#0FA958]' : 'font-medium text-slate-500 dark:text-slate-400'
            }`}
          >
            Profile
          </span>
        </button>
      </div>
    </nav>
  );
};
