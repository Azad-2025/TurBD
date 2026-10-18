import React from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  RotateCcw,
  MapPin,
  Check,
  Building2,
  Sun,
  Sparkles,
  Layers,
  ArrowUpDown,
  SlidersHorizontal,
  ShieldCheck,
} from 'lucide-react';
import { BANGLADESH_CITIES, DHAKA_AREAS } from '../data/mockData';
import { VenueType } from '../types';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose }) => {
  const { searchFilters, setSearchFilters, resetFilters } = useApp();

  if (!isOpen) return null;

  const venueTypes: { id: VenueType | 'all'; label: string; icon: any }[] = [
    { id: 'all', label: 'All Venues', icon: Layers },
    { id: 'outdoor', label: 'Outdoor Turf', icon: Sun },
    { id: 'indoor', label: 'Indoor Cage', icon: Building2 },
    { id: 'rooftop', label: 'Rooftop Arena', icon: Sparkles },
  ];

  const sortOptions: { id: 'recommended' | 'distance' | 'price_asc' | 'price_desc' | 'rating'; label: string }[] = [
    { id: 'recommended', label: 'Recommended' },
    { id: 'distance', label: 'Nearest to Me 📍' },
    { id: 'rating', label: 'Top Rated ⭐' },
    { id: 'price_asc', label: 'Price: Low to High' },
    { id: 'price_desc', label: 'Price: High to Low' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200/80 animate-in slide-in-from-bottom duration-300"
        id="filter-modal"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0FA958] flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">Filter Arenas</h3>
              <p className="text-xs text-slate-500">Refine by location, price &amp; arena type</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => resetFilters()}
              className="text-xs text-slate-500 hover:text-[#0FA958] flex items-center gap-1 font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Location: City & Area */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0FA958]" />
              <span>City &amp; Area</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <span className="text-[11px] text-slate-500 mb-1 block">City</span>
                <select
                  value={searchFilters.city}
                  onChange={(e) =>
                    setSearchFilters((prev) => ({
                      ...prev,
                      city: e.target.value,
                      area: 'All Areas',
                    }))
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#0FA958] focus:ring-1 focus:ring-[#0FA958] transition-all cursor-pointer"
                >
                  {BANGLADESH_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 mb-1 block">Area</span>
                <select
                  value={searchFilters.area}
                  onChange={(e) =>
                    setSearchFilters((prev) => ({
                      ...prev,
                      area: e.target.value,
                    }))
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#0FA958] focus:ring-1 focus:ring-[#0FA958] transition-all cursor-pointer"
                >
                  {searchFilters.city === 'Dhaka'
                    ? DHAKA_AREAS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))
                    : ['All Areas'].map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                </select>
              </div>
            </div>
          </div>

          {/* Venue Type Pills */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
              Venue Environment
            </label>
            <div className="grid grid-cols-2 gap-2">
              {venueTypes.map((v) => {
                const Icon = v.icon;
                const isSelected = searchFilters.venueType === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() =>
                      setSearchFilters((prev) => ({
                        ...prev,
                        venueType: v.id,
                      }))
                    }
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#0FA958] text-white border-[#0FA958] shadow-sm shadow-[#0FA958]/25'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{v.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort Option */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#0FA958]" />
              <span>Sort By</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((opt) => {
                const isSelected = searchFilters.sortBy === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() =>
                      setSearchFilters((prev) => ({
                        ...prev,
                        sortBy: opt.id,
                      }))
                    }
                    className={`px-3 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-[#0FA958] text-white border-[#0FA958] shadow-sm shadow-[#0FA958]/25'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Max Price Range Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Max Hourly Budget
              </label>
              <span className="text-xs font-black text-[#0FA958] font-mono">
                Up to ৳{searchFilters.maxPrice.toLocaleString()}/hr
              </span>
            </div>
            <input
              type="range"
              min="800"
              max="4000"
              step="100"
              value={searchFilters.maxPrice}
              onChange={(e) =>
                setSearchFilters((prev) => ({
                  ...prev,
                  maxPrice: Number(e.target.value),
                }))
              }
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0FA958]"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-1">
              <span>৳800</span>
              <span>৳2,400</span>
              <span>৳4,000+</span>
            </div>
          </div>

          {/* Verified Partner Venues Toggle */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0FA958]" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Verified Arenas Only</span>
                <span className="text-[11px] text-slate-500">Only show TurfBD inspected venues</span>
              </div>
            </div>
            <button
              onClick={() =>
                setSearchFilters((prev) => ({
                  ...prev,
                  verifiedOnly: !prev.verifiedOnly,
                }))
              }
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                searchFilters.verifiedOnly ? 'bg-[#0FA958]' : 'bg-slate-200'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 left-0.5 ${
                  searchFilters.verifiedOnly ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Modal Footer CTA */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-[#0FA958] hover:bg-[#0da052] active:bg-[#064E3B] text-white font-bold text-xs sm:text-sm rounded-full transition-all shadow-md shadow-[#0FA958]/30 text-center cursor-pointer active:scale-98"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
