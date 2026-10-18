import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  RotateCcw,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
  Building2,
  Sun,
  Layers,
  ArrowUpDown,
  Compass,
  Map as MapIcon,
  LayoutGrid,
  Columns,
} from 'lucide-react';
import { BANGLADESH_CITIES, DHAKA_AREAS } from '../data/mockData';
import { VenueType, VerifiedBadgeTier } from '../types';

export const SearchBar: React.FC = () => {
  const { searchFilters, setSearchFilters, resetFilters } = useApp();
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const sports = [
    { id: 'all', label: 'All Sports', icon: '🏆' },
    { id: 'football', label: 'Football', icon: '⚽' },
    { id: 'cricket', label: 'Box Cricket', icon: '🏏' },
    { id: 'badminton', label: 'Badminton', icon: '🏸' },
    { id: 'futsal', label: 'Futsal', icon: '🥅' },
  ];

  const venueTypes: { id: VenueType | 'all'; label: string; icon: any }[] = [
    { id: 'all', label: 'All Arenas', icon: Layers },
    { id: 'outdoor', label: 'Outdoor Turf', icon: Sun },
    { id: 'indoor', label: 'Indoor Cage', icon: Building2 },
    { id: 'rooftop', label: 'Rooftop Arena', icon: Sparkles },
  ];

  const timeSlots = [
    { id: 'all', label: 'Any Slot' },
    { id: 'morning', label: 'Morning (06:00 - 12:00)' },
    { id: 'afternoon', label: 'Afternoon (12:00 - 17:00)' },
    { id: 'evening', label: 'Evening Peak (17:00 - 21:00)' },
    { id: 'night', label: 'Late Night (21:00 - 02:00)' },
  ];

  const sortOptions = [
    { id: 'recommended', label: 'Recommended' },
    { id: 'distance', label: 'Nearest to Me 📍' },
    { id: 'price_asc', label: 'Price: Low to High' },
    { id: 'price_desc', label: 'Price: High to Low' },
    { id: 'rating', label: 'Top Rated ⭐' },
  ];

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-card">
      {/* Primary Search Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Keyword Search */}
        <div className="relative">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Search Arena or Turf</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchFilters.query}
              onChange={(e) => setSearchFilters((prev) => ({ ...prev, query: e.target.value }))}
              placeholder="e.g. Gulshan Arena, Daffodil..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#0FA958] focus:ring-1 focus:ring-[#0FA958] transition-all"
              id="search-query-input"
            />
          </div>
        </div>

        {/* City & Area */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">City & District Area</label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={searchFilters.city}
              onChange={(e) => setSearchFilters((prev) => ({ ...prev, city: e.target.value, area: 'All Areas' }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs text-[#0F172A] focus:bg-white focus:outline-none focus:border-[#0FA958] cursor-pointer transition-all"
              id="search-city-select"
            >
              {BANGLADESH_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={searchFilters.area}
              onChange={(e) => setSearchFilters((prev) => ({ ...prev, area: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs text-[#0F172A] focus:bg-white focus:outline-none focus:border-[#0FA958] cursor-pointer transition-all"
              id="search-area-select"
            >
              {DHAKA_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Match Date & Time Preference (Availability-based search) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Date & Time Slot</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={searchFilters.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSearchFilters((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-8 pr-2 text-xs text-[#0F172A] focus:bg-white focus:outline-none focus:border-[#0FA958] transition-all"
                id="search-date-input"
              />
            </div>

            <div className="relative">
              <Clock className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <select
                value={searchFilters.timeSlot || 'all'}
                onChange={(e) => setSearchFilters((prev) => ({ ...prev, timeSlot: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-8 pr-2 text-xs text-[#0F172A] focus:bg-white focus:outline-none focus:border-[#0FA958] cursor-pointer transition-all"
                id="search-timeslot-select"
              >
                {timeSlots.map((ts) => (
                  <option key={ts.id} value={ts.id}>
                    {ts.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Price Filter & Quick Reset */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-700">
              Max Rate: <span className="text-[#064E3B] font-black">৳{searchFilters.maxPrice}/hr</span>
            </label>
            <button
              onClick={resetFilters}
              className="text-[11px] font-semibold text-slate-400 hover:text-[#0FA958] flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset all search filters"
              id="search-reset-btn"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
          <div className="pt-1.5">
            <input
              type="range"
              min="1000"
              max="3500"
              step="100"
              value={searchFilters.maxPrice}
              onChange={(e) => setSearchFilters((prev) => ({ ...prev, maxPrice: Number(e.target.value) }))}
              className="w-full accent-[#0FA958] cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              id="search-price-range"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>৳1,000</span>
              <span>৳2,200</span>
              <span>৳3,500</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sport Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-100">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap pr-1 flex items-center gap-1">
          <SlidersHorizontal className="w-3 h-3 text-[#0FA958]" /> Sport:
        </span>
        {sports.map((s) => (
          <button
            key={s.id}
            onClick={() => setSearchFilters((prev) => ({ ...prev, sport: s.id }))}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              searchFilters.sport === s.id
                ? 'bg-[#0FA958] text-white font-bold shadow-sm shadow-[#0FA958]/30 scale-102'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
            id={`filter-sport-${s.id}`}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Discovery Tool Ribbon: Venue Type + Verified Badges + Sort + View Mode */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Left: Indoor/Outdoor Venue Type Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pr-1">Type:</span>
          {venueTypes.map((vt) => {
            const Icon = vt.icon;
            const isSelected = (searchFilters.venueType || 'all') === vt.id;
            return (
              <button
                key={vt.id}
                onClick={() => setSearchFilters((prev) => ({ ...prev, venueType: vt.id }))}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 text-[#064E3B] border border-emerald-300 font-bold shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
                id={`filter-venue-type-${vt.id}`}
              >
                <Icon className="w-3 h-3 text-[#0FA958]" />
                <span>{vt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Center: Badge Filter Pills */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() =>
              setSearchFilters((prev) => ({
                ...prev,
                badge: prev.badge === 'all' || !prev.badge ? 'turfbd_verified' : prev.badge === 'turfbd_verified' ? 'gold_partner' : 'all',
                verifiedOnly: prev.badge === 'all' || !prev.badge,
              }))
            }
            className={`px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
              searchFilters.badge === 'gold_partner'
                ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                : searchFilters.badge === 'turfbd_verified' || searchFilters.verifiedOnly
                ? 'bg-emerald-50 text-[#064E3B] border-emerald-300 font-bold'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            id="filter-badge-toggle"
          >
            {searchFilters.badge === 'gold_partner' ? (
              <>
                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>👑 Gold Partners Only</span>
              </>
            ) : searchFilters.badge === 'turfbd_verified' || searchFilters.verifiedOnly ? (
              <>
                <ShieldCheck className="w-3 h-3 text-[#0FA958]" />
                <span>🛡️ Verified Venues</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3 h-3 text-slate-400" />
                <span>Filter by Verification</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Sort By + View Mode Switcher */}
        <div className="flex items-center gap-2">
          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <select
              value={searchFilters.sortBy || 'recommended'}
              onChange={(e) => setSearchFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
              className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
              id="search-sort-select"
            >
              {sortOptions.map((so) => (
                <option key={so.id} value={so.id}>
                  {so.label}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Switcher (Split, Grid, Map) */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5">
            <button
              onClick={() => setSearchFilters((prev) => ({ ...prev, viewMode: 'split' }))}
              title="Split View: Map & List"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                (searchFilters.viewMode || 'split') === 'split'
                  ? 'bg-white text-[#064E3B] font-bold shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              id="view-mode-split-btn"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSearchFilters((prev) => ({ ...prev, viewMode: 'grid' }))}
              title="Grid List Only"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                searchFilters.viewMode === 'grid'
                  ? 'bg-white text-[#064E3B] font-bold shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              id="view-mode-grid-btn"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSearchFilters((prev) => ({ ...prev, viewMode: 'map' }))}
              title="Full Map Radar Only"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                searchFilters.viewMode === 'map'
                  ? 'bg-white text-[#064E3B] font-bold shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              id="view-mode-map-btn"
            >
              <MapIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
