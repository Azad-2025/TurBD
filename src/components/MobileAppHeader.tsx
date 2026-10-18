import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TurfBDLogo } from './TurfBDLogo';
import { NotificationBell } from './NotificationBell';
import { FilterModal } from './FilterModal';
import {
  Search,
  SlidersHorizontal,
  X,
  MapPin,
} from 'lucide-react';

export const MobileAppHeader: React.FC = () => {
  const {
    searchFilters,
    setSearchFilters,
    setActiveTab,
  } = useApp();

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const handleSearchChange = (val: string) => {
    setSearchFilters((prev) => ({
      ...prev,
      query: val,
    }));
  };

  const handleClearSearch = () => {
    setSearchFilters((prev) => ({
      ...prev,
      query: '',
    }));
  };

  return (
    <>
      <header
        id="mobile-app-header"
        className="sticky top-0 z-40 bg-white dark:bg-[#0B1315] border-b border-slate-200 dark:border-slate-800 shadow-xs pt-[env(safe-area-inset-top,0px)] transition-colors"
      >
        {/* Top Row: Official Logo, City Selector, and Notification Bell */}
        <div className="px-3.5 pt-2.5 pb-1.5 flex items-center justify-between gap-2">
          {/* Official TurfBD Brand Logo */}
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center group cursor-pointer focus:outline-none active:scale-95 transition-transform shrink-0"
            id="mobile-header-logo-btn"
            title="TurfBD Home"
          >
            <TurfBDLogo
              layout="horizontal"
              size="sm"
              variant="brand"
              showTagline={false}
              showBadge={true}
              badgeText="Sports"
              id="mobile-header-logo"
            />
          </button>

          {/* City Selector Pill & Notifications */}
          <div className="flex items-center gap-2">
            {/* Quick City Dropdown */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-full px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200">
              <MapPin className="w-3 h-3 text-[#0FA958] shrink-0" />
              <select
                value={searchFilters.city}
                onChange={(e) =>
                  setSearchFilters((prev) => ({
                    ...prev,
                    city: e.target.value,
                    area: 'All Areas',
                  }))
                }
                className="bg-transparent border-none text-[11px] font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                id="mobile-city-select"
              >
                <option value="All Cities">All BD</option>
                <option value="Dhaka">Dhaka</option>
                <option value="Chattogram">Ctg</option>
                <option value="Sylhet">Sylhet</option>
              </select>
            </div>

            {/* Notification Bell */}
            <NotificationBell />
          </div>
        </div>

        {/* Bottom Row: Search Bar & Filter Button */}
        <div className="px-3.5 pb-2.5 pt-1 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchFilters.query}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search turfs, areas, or sports..."
              className="w-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 font-medium py-2 pl-9 pr-8 rounded-xl focus:border-[#0FA958] focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition-colors"
              id="mobile-header-search-input"
            />
            {searchFilters.query && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-white flex items-center justify-center text-[10px] transition-colors cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Filter button */}
          <button
            onClick={() => setIsFilterModalOpen(true)}
            id="mobile-header-filter-btn"
            aria-label="Filter"
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-95 cursor-pointer shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
      />
    </>
  );
};
