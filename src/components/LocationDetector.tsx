import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Navigation, MapPin, Compass, Check, AlertCircle, Loader2, Crosshair, ChevronDown } from 'lucide-react';
import { BANGLADESH_PRESET_LOCATIONS, PopularLocation } from '../utils/geo';

export const LocationDetector: React.FC = () => {
  const { searchFilters, setSearchFilters } = useApp();
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isOpenPresets, setIsOpenPresets] = useState<boolean>(false);

  const radiusOptions = [
    { value: 3, label: '3 km' },
    { value: 5, label: '5 km' },
    { value: 10, label: '10 km' },
    { value: 25, label: '25 km' },
    { value: 100, label: 'All Distances' },
  ];

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSearchFilters((prev) => ({
          ...prev,
          userLocation: {
            latitude,
            longitude,
            name: 'Current Location (GPS)',
            isDetected: true,
          },
          sortBy: 'distance', // Automatically prioritize nearest turfs
        }));
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError('Location permission was denied. You can pick a nearby preset below.');
        } else if (error.code === error.TIMEOUT) {
          setGeoError('Location request timed out. Please retry or choose a preset.');
        } else {
          setGeoError('Unable to retrieve location. Please choose a preset below.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleSelectPreset = (loc: PopularLocation) => {
    setSearchFilters((prev) => ({
      ...prev,
      city: loc.city,
      area: loc.area,
      userLocation: {
        latitude: loc.latitude,
        longitude: loc.longitude,
        name: loc.name,
        isDetected: true,
      },
      sortBy: 'distance',
    }));
    setIsOpenPresets(false);
    setGeoError(null);
  };

  const handleResetLocation = () => {
    setSearchFilters((prev) => ({
      ...prev,
      userLocation: null,
      sortBy: 'recommended',
    }));
    setGeoError(null);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 mb-4 shadow-card text-[#0F172A]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Location Action & Current Status */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleDetectLocation}
            disabled={isLocating}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer select-none active:scale-95 shadow-sm ${
              searchFilters.userLocation?.isDetected
                ? 'bg-[#0FA958] hover:bg-[#0da052] text-white shadow-emerald-500/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'
            }`}
            id="detect-location-btn"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0FA958]" />
                <span>Locating GPS...</span>
              </>
            ) : searchFilters.userLocation?.isDetected ? (
              <>
                <Navigation className="w-3.5 h-3.5 fill-current" />
                <span>Near: {searchFilters.userLocation.name}</span>
              </>
            ) : (
              <>
                <Crosshair className="w-3.5 h-3.5 text-[#0FA958]" />
                <span>Detect My Location</span>
              </>
            )}
          </button>

          {/* Quick Presets Dropdown / Toggle */}
          <div className="relative">
            <button
              onClick={() => setIsOpenPresets((prev) => !prev)}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              id="preset-locations-toggle"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              <span>Presets</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpenPresets ? 'rotate-180' : ''}`} />
            </button>

            {isOpenPresets && (
              <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
                  Dhaka &amp; BD Sports Hubs
                </div>
                <div className="space-y-1 max-h-56 overflow-y-auto scrollbar-thin">
                  {BANGLADESH_PRESET_LOCATIONS.map((loc) => {
                    const isSelected =
                      searchFilters.userLocation?.latitude === loc.latitude &&
                      searchFilters.userLocation?.longitude === loc.longitude;
                    return (
                      <button
                        key={loc.id}
                        onClick={() => handleSelectPreset(loc)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 text-[#064E3B] font-semibold border border-emerald-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                        id={`preset-loc-${loc.id}`}
                      >
                        <div>
                          <div className="font-semibold text-[#0F172A]">{loc.name}</div>
                          <div className="text-[10px] text-[#64748B]">{loc.area}, {loc.city}</div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#0FA958]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {searchFilters.userLocation && (
            <button
              onClick={handleResetLocation}
              className="text-[11px] text-slate-400 hover:text-red-500 transition-colors cursor-pointer underline underline-offset-2"
              id="clear-location-btn"
            >
              Clear
            </button>
          )}
        </div>

        {/* Right: Search Radius Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap pr-1 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-slate-400" /> Radius:
          </span>
          {radiusOptions.map((r) => (
            <button
              key={r.value}
              onClick={() => setSearchFilters((prev) => ({ ...prev, maxDistanceKm: r.value }))}
              className={`px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                searchFilters.maxDistanceKm === r.value
                  ? 'bg-emerald-50 text-[#064E3B] border border-emerald-300 font-bold shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
              id={`radius-option-${r.value}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Geolocation error message banner */}
      {geoError && (
        <div className="mt-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{geoError}</span>
        </div>
      )}
    </div>
  );
};
