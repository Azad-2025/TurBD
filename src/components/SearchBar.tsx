import React from 'react';
import { useApp } from '../context/AppContext';
import { Search, MapPin, Calendar, DollarSign, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { BANGLADESH_CITIES, DHAKA_AREAS } from '../data/mockData';

export const SearchBar: React.FC = () => {
  const { searchFilters, setSearchFilters, resetFilters } = useApp();

  const sports = [
    { id: 'all', label: 'All Sports', icon: '🏆' },
    { id: 'football', label: 'Football', icon: '⚽' },
    { id: 'cricket', label: 'Box Cricket', icon: '🏏' },
    { id: 'badminton', label: 'Badminton', icon: '🏸' },
    { id: 'futsal', label: 'Futsal', icon: '🥅' },
  ];

  return (
    <div className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl">
      {/* Top Search Input & Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Keyword Search */}
        <div className="relative">
          <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Search Turf or Arena</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={searchFilters.query}
              onChange={(e) => setSearchFilters((prev) => ({ ...prev, query: e.target.value }))}
              placeholder="e.g. Gulshan Arena, Daffodil..."
              className="w-full bg-neutral-800 border border-neutral-700/80 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              id="search-query-input"
            />
          </div>
        </div>

        {/* City & Area */}
        <div>
          <label className="block text-[11px] font-semibold text-neutral-400 mb-1">City & Area</label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={searchFilters.city}
              onChange={(e) => setSearchFilters((prev) => ({ ...prev, city: e.target.value, area: 'All Areas' }))}
              className="w-full bg-neutral-800 border border-neutral-700/80 rounded-xl py-2 px-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              id="search-city-select"
            >
              {BANGLADESH_CITIES.map((c) => (
                <option key={c} value={c} className="bg-neutral-900">
                  {c}
                </option>
              ))}
            </select>

            <select
              value={searchFilters.area}
              onChange={(e) => setSearchFilters((prev) => ({ ...prev, area: e.target.value }))}
              className="w-full bg-neutral-800 border border-neutral-700/80 rounded-xl py-2 px-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              id="search-area-select"
            >
              {DHAKA_AREAS.map((a) => (
                <option key={a} value={a} className="bg-neutral-900">
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Match Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
            <input
              type="date"
              value={searchFilters.date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSearchFilters((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full bg-neutral-800 border border-neutral-700/80 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              id="search-date-input"
            />
          </div>
        </div>

        {/* Price Filter & Reset */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-neutral-400">
              Max Rate: <span className="text-emerald-400 font-bold">৳{searchFilters.maxPrice}/hr</span>
            </label>
            <button
              onClick={resetFilters}
              className="text-[11px] text-neutral-400 hover:text-emerald-400 flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset all filters"
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
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-neutral-700 rounded-lg appearance-none"
              id="search-price-range"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 mt-1 font-mono">
              <span>৳1,000</span>
              <span>৳2,200</span>
              <span>৳3,500</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sport Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider whitespace-nowrap pr-1 flex items-center gap-1">
          <SlidersHorizontal className="w-3 h-3" /> Sport:
        </span>
        {sports.map((s) => (
          <button
            key={s.id}
            onClick={() => setSearchFilters((prev) => ({ ...prev, sport: s.id }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              searchFilters.sport === s.id
                ? 'bg-emerald-500 text-neutral-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-750 hover:text-white border border-neutral-700/50'
            }`}
            id={`filter-sport-${s.id}`}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
