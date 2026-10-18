import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import { Turf } from '../types';
import { useApp } from '../context/AppContext';
import {
  MapPin,
  Star,
  Zap,
  Navigation,
  ExternalLink,
  DollarSign,
  Maximize2,
  Sliders,
  Layers,
  Info,
} from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import { formatDistance, estimateDriveTimeMinutes } from '../utils/geo';

interface TurfMapProps {
  turfs: Turf[];
  selectedTurfId?: string | null;
  onSelectTurf?: (turf: Turf) => void;
  height?: string;
  className?: string;
}

// Marker component for individual turf pins
const TurfMarkerItem: React.FC<{
  turf: Turf;
  isSelected: boolean;
  onSelect: (turf: Turf) => void;
  onOpenInfo: (turf: Turf, anchor: google.maps.marker.AdvancedMarkerElement) => void;
}> = ({ turf, isSelected, onSelect, onOpenInfo }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  const getSportEmoji = (sports: string[]) => {
    if (sports.includes('football')) return '⚽';
    if (sports.includes('cricket')) return '🏏';
    if (sports.includes('badminton')) return '🏸';
    return '🥅';
  };

  const isGold = turf.verifiedBadge === 'gold_partner';

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: turf.latitude, lng: turf.longitude }}
      title={turf.name}
      onClick={() => {
        onSelect(turf);
        if (marker) onOpenInfo(turf, marker);
      }}
    >
      <div
        className={`relative flex flex-col items-center transition-all duration-200 cursor-pointer ${
          isSelected ? 'scale-115 z-40' : 'hover:scale-110 z-20'
        }`}
        id={`map-marker-${turf.id}`}
      >
        {/* Floating Price Pill */}
        <div
          className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight shadow-md border whitespace-nowrap mb-1 flex items-center gap-1 ${
            isGold
              ? 'bg-amber-500 text-white border-amber-300 ring-2 ring-amber-400/40'
              : isSelected
              ? 'bg-[#0FA958] text-white border-white ring-2 ring-emerald-500/50'
              : 'bg-white text-[#064E3B] border-slate-200 shadow-2xs backdrop-blur'
          }`}
        >
          <span>৳{turf.hourlyRate}</span>
        </div>

        {/* Pin Body */}
        <div
          className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm shadow-md transition-colors border-2 ${
            isGold
              ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white border-amber-200 shadow-amber-500/30'
              : isSelected
              ? 'bg-[#0FA958] text-white border-white shadow-emerald-500/40'
              : 'bg-white text-slate-800 border-slate-200 hover:border-[#0FA958]'
          }`}
        >
          <span>{getSportEmoji(turf.sports)}</span>
        </div>

        {/* Pin Tip Arrow */}
        <div
          className={`w-2 h-2 rotate-45 -mt-1 ${
            isGold ? 'bg-amber-600' : isSelected ? 'bg-[#0FA958]' : 'bg-white border-r border-b border-slate-200'
          }`}
        />
      </div>
    </AdvancedMarker>
  );
};

// Fallback Interactive Visual Canvas Map when Google Maps API key is not yet set
const VisualMapFallback: React.FC<{
  turfs: Turf[];
  userLocation: { latitude: number; longitude: number; name?: string } | null;
  selectedTurf: Turf | null;
  onSelectTurf: (turf: Turf) => void;
  onBookTurf: (turf: Turf) => void;
}> = ({ turfs, userLocation, selectedTurf, onSelectTurf, onBookTurf }) => {
  // Center around user or Dhaka
  const centerLat = userLocation ? userLocation.latitude : 23.8103;
  const centerLng = userLocation ? userLocation.longitude : 90.4125;

  // Convert lat/lng coordinates to percentage of visual area
  // Dhaka region roughly lat: 23.68 to 23.92, lng: 90.30 to 90.48
  const latMin = 23.68;
  const latMax = 23.92;
  const lngMin = 90.30;
  const lngMax = 90.48;

  const toPercentX = (lng: number) => {
    const clamped = Math.max(lngMin, Math.min(lngMax, lng));
    return ((clamped - lngMin) / (lngMax - lngMin)) * 100;
  };

  const toPercentY = (lat: number) => {
    const clamped = Math.max(latMin, Math.min(latMax, lat));
    return (1 - (clamped - latMin) / (latMax - latMin)) * 100;
  };

  return (
    <div className="relative w-full h-full bg-[#EBF3EE] overflow-hidden rounded-2xl border border-slate-200/90 flex flex-col justify-between select-none shadow-card">
      {/* Grid Pattern & City Zones */}
      <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(#0FA958_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Decorative City Boundaries & River lines */}
      <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none stroke-emerald-300 fill-none" strokeWidth="1.5">
        <path d="M 10 40 Q 120 180 200 240 T 400 380 T 700 500" stroke="#38bdf8" strokeWidth="3" />
        <path d="M 80 10 L 220 190 L 310 260 L 520 400" stroke="#cbd5e1" strokeDasharray="4,4" />
        <circle cx="50%" cy="50%" r="180" stroke="#0FA958" strokeOpacity="0.2" strokeDasharray="6,6" />
        <circle cx="50%" cy="50%" r="320" stroke="#0FA958" strokeOpacity="0.12" strokeDasharray="6,6" />
      </svg>

      {/* Neighborhood Landmarks */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-widest text-slate-500 uppercase pointer-events-none bg-white/70 backdrop-blur-xs px-2 py-0.5 rounded-full border border-slate-200/60">
        Uttara Sector 11
      </div>
      <div className="absolute top-1/3 left-1/4 text-[10px] font-bold tracking-widest text-slate-500 uppercase pointer-events-none bg-white/70 backdrop-blur-xs px-2 py-0.5 rounded-full border border-slate-200/60">
        Mirpur DOHS
      </div>
      <div className="absolute top-1/2 right-1/4 text-[10px] font-bold tracking-widest text-slate-500 uppercase pointer-events-none bg-white/70 backdrop-blur-xs px-2 py-0.5 rounded-full border border-slate-200/60">
        Gulshan / Banani
      </div>
      <div className="absolute bottom-1/4 left-1/3 text-[10px] font-bold tracking-widest text-slate-500 uppercase pointer-events-none bg-white/70 backdrop-blur-xs px-2 py-0.5 rounded-full border border-slate-200/60">
        Dhanmondi
      </div>
      <div className="absolute bottom-10 right-1/3 text-[10px] font-bold tracking-widest text-slate-500 uppercase pointer-events-none bg-white/70 backdrop-blur-xs px-2 py-0.5 rounded-full border border-slate-200/60">
        Bashundhara R/A
      </div>

      {/* User Location Radar Marker */}
      {userLocation && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center"
          style={{
            left: `${toPercentX(userLocation.longitude)}%`,
            top: `${toPercentY(userLocation.latitude)}%`,
          }}
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping" />
            <span className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md shadow-blue-500/50" />
          </div>
          <span className="mt-1 bg-white/95 text-blue-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-blue-200 whitespace-nowrap shadow-2xs">
            📍 You Are Here
          </span>
        </div>
      )}

      {/* Turf Markers on Visual Map */}
      {turfs.map((t) => {
        const isSelected = selectedTurf?.id === t.id;
        const isGold = t.verifiedBadge === 'gold_partner';
        const posX = toPercentX(t.longitude);
        const posY = toPercentY(t.latitude);

        return (
          <div
            key={t.id}
            onClick={() => onSelectTurf(t)}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer transition-transform hover:scale-115 active:scale-95"
            style={{ left: `${posX}%`, top: `${posY}%` }}
            id={`fallback-pin-${t.id}`}
          >
            <div className="flex flex-col items-center">
              <div
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-black mb-0.5 whitespace-nowrap border shadow-2xs ${
                  isGold
                    ? 'bg-amber-500 text-white border-amber-300 font-bold'
                    : isSelected
                    ? 'bg-[#0FA958] text-white border-white'
                    : 'bg-white text-[#064E3B] border-slate-200'
                }`}
              >
                ৳{t.hourlyRate}
              </div>

              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shadow-soft border-2 ${
                  isGold
                    ? 'bg-amber-500 text-white border-amber-200'
                    : isSelected
                    ? 'bg-[#0FA958] text-white border-white ring-2 ring-emerald-400/50'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-[#0FA958]'
                }`}
              >
                {t.sports.includes('football') ? '⚽' : t.sports.includes('cricket') ? '🏏' : '🏸'}
              </div>
            </div>
          </div>
        );
      })}

      {/* Map Control Bar Top */}
      <div className="relative p-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 shadow-2xs">
          <Layers className="w-3.5 h-3.5 text-[#0FA958]" />
          <span className="font-semibold text-[#0F172A]">TurfBD Interactive Radar</span>
          <span className="text-[10px] text-[#64748B] font-mono">({turfs.length} venues mapped)</span>
        </div>

        <div className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-200 text-[10px] text-amber-700 flex items-center gap-1 font-medium shadow-2xs">
          <Info className="w-3 h-3 text-amber-600 shrink-0" />
          <span>Vector Mode (Add Maps Key for Satellite View)</span>
        </div>
      </div>

      {/* Selected Turf Floating Info Bottom Sheet */}
      {selectedTurf && (
        <div className="relative m-3 p-3.5 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-card z-30 max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <VerifiedBadge tier={selectedTurf.verifiedBadge} size="sm" />
                <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded capitalize font-medium border border-slate-200">
                  {selectedTurf.venueType === 'indoor' ? '🏢 Indoor' : selectedTurf.venueType === 'rooftop' ? '🌆 Rooftop' : '🌿 Outdoor'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-[#0F172A] line-clamp-1">{selectedTurf.name}</h4>
              <p className="text-[11px] text-[#64748B] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#0FA958]" />
                <span>{selectedTurf.area}, {selectedTurf.city}</span>
                {selectedTurf.distanceKm !== undefined && (
                  <span className="text-[#064E3B] font-semibold">
                    • {formatDistance(selectedTurf.distanceKm)} away
                  </span>
                )}
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs font-black text-[#064E3B] font-mono">৳{selectedTurf.hourlyRate}/hr</div>
              <div className="flex items-center justify-end gap-1 text-[11px] text-amber-600 font-bold">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{selectedTurf.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => onSelectTurf(selectedTurf)}
              className="flex-1 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center cursor-pointer"
            >
              View Arena
            </button>
            <button
              onClick={() => onBookTurf(selectedTurf)}
              className="flex-1 py-1.5 text-xs font-bold text-white bg-[#0FA958] hover:bg-[#0da052] rounded-xl transition-all shadow-md shadow-[#0FA958]/20 text-center cursor-pointer"
            >
              Book Slot
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const TurfMap: React.FC<TurfMapProps> = ({
  turfs,
  selectedTurfId,
  onSelectTurf,
  height = '500px',
  className = '',
}) => {
  const { searchFilters, setSelectedTurf, setBookingTurf } = useApp();
  const [activeTurf, setActiveTurf] = useState<Turf | null>(null);
  const [infoAnchor, setInfoAnchor] = useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);

  const googleMapsApiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

  // Center coordinate
  const defaultCenter = searchFilters.userLocation
    ? { lat: searchFilters.userLocation.latitude, lng: searchFilters.userLocation.longitude }
    : { lat: 23.8103, lng: 90.4125 }; // Dhaka city center

  // Update active turf when selectedTurfId prop changes
  useEffect(() => {
    if (selectedTurfId) {
      const found = turfs.find((t) => t.id === selectedTurfId);
      if (found) setActiveTurf(found);
    }
  }, [selectedTurfId, turfs]);

  const handleSelectTurf = (turf: Turf) => {
    setActiveTurf(turf);
    if (onSelectTurf) onSelectTurf(turf);
    setSelectedTurf(turf);
  };

  const handleBookTurf = (turf: Turf) => {
    setBookingTurf(turf);
  };

  // If no Google Maps API Key has been provided in environment, render the rich visual map canvas
  if (!googleMapsApiKey || googleMapsApiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
    return (
      <div style={{ height }} className={`w-full relative ${className}`}>
        <VisualMapFallback
          turfs={turfs}
          userLocation={searchFilters.userLocation}
          selectedTurf={activeTurf}
          onSelectTurf={handleSelectTurf}
          onBookTurf={handleBookTurf}
        />
      </div>
    );
  }

  return (
    <div style={{ height }} className={`w-full relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-card ${className}`}>
      <APIProvider apiKey={googleMapsApiKey}>
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={12}
          mapId="DEMO_MAP_ID"
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="w-full h-full"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          {/* User Location Radar Marker */}
          {searchFilters.userLocation && (
            <AdvancedMarker
              position={{
                lat: searchFilters.userLocation.latitude,
                lng: searchFilters.userLocation.longitude,
              }}
              title="You Are Here"
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping pointer-events-none" />
                <span className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg shadow-blue-500/50" />
              </div>
            </AdvancedMarker>
          )}

          {/* Turf Pins */}
          {turfs.map((turf) => (
            <TurfMarkerItem
              key={turf.id}
              turf={turf}
              isSelected={activeTurf?.id === turf.id}
              onSelect={handleSelectTurf}
              onOpenInfo={(t, anchor) => {
                setActiveTurf(t);
                setInfoAnchor(anchor);
                setIsInfoOpen(true);
              }}
            />
          ))}

          {/* Info Window */}
          {isInfoOpen && activeTurf && infoAnchor && (
            <InfoWindow
              anchor={infoAnchor}
              onCloseClick={() => setIsInfoOpen(false)}
              maxWidth={300}
            >
              <div className="p-1 text-neutral-900 font-sans">
                <div className="relative h-28 w-full rounded-lg overflow-hidden mb-2 bg-neutral-100">
                  <img
                    src={activeTurf.images[0] || 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=400&q=80'}
                    alt={activeTurf.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5">
                    <VerifiedBadge tier={activeTurf.verifiedBadge} size="sm" />
                  </div>
                </div>

                <h4 className="text-sm font-bold text-neutral-950 line-clamp-1 mb-0.5">{activeTurf.name}</h4>
                <div className="text-[11px] text-neutral-600 flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>{activeTurf.area}, {activeTurf.city}</span>
                  {activeTurf.distanceKm !== undefined && (
                    <span className="font-semibold text-emerald-700">
                      • {formatDistance(activeTurf.distanceKm)}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-neutral-200">
                  <div>
                    <span className="text-xs font-black text-emerald-600 font-mono">৳{activeTurf.hourlyRate}</span>
                    <span className="text-[10px] text-neutral-500">/hr</span>
                  </div>

                  <button
                    onClick={() => {
                      handleBookTurf(activeTurf);
                      setIsInfoOpen(false);
                    }}
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Book Slot
                  </button>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
};
