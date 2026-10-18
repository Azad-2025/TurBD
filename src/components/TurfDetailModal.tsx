import React, { useState } from 'react';
import { Turf } from '../types';
import { useApp } from '../context/AppContext';
import {
  X,
  MapPin,
  Star,
  Clock,
  Zap,
  Phone,
  ShieldCheck,
  Check,
  Info,
  Calendar,
  Share2,
  ExternalLink,
  Navigation,
  Building2,
  Sun,
  Sparkles,
  Compass,
} from 'lucide-react';
import { ReviewSection } from './ReviewSection';
import { VerifiedBadge } from './VerifiedBadge';
import { calculateDistanceKm, formatDistance, estimateDriveTimeMinutes } from '../utils/geo';

export const TurfDetailModal: React.FC = () => {
  const { selectedTurf, setSelectedTurf, setBookingTurf, searchFilters } = useApp();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!selectedTurf) return null;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBookClick = () => {
    const turfToBook = selectedTurf;
    setSelectedTurf(null);
    setBookingTurf(turfToBook);
  };

  // Distance computation
  let distanceKm = selectedTurf.distanceKm;
  let distanceFormatted = selectedTurf.distanceFormatted;
  let driveTime = selectedTurf.driveTimeMinutes;

  if (distanceKm === undefined && searchFilters.userLocation && selectedTurf.latitude && selectedTurf.longitude) {
    distanceKm = calculateDistanceKm(
      searchFilters.userLocation.latitude,
      searchFilters.userLocation.longitude,
      selectedTurf.latitude,
      selectedTurf.longitude
    );
    distanceFormatted = formatDistance(distanceKm);
    driveTime = estimateDriveTimeMinutes(distanceKm);
  }

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${selectedTurf.latitude || 23.8103},${selectedTurf.longitude || 90.4125}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      id="turf-detail-modal"
    >
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl my-auto text-[#0F172A]">
        {/* Top Header Actions */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2.5 bg-white/90 hover:bg-white text-slate-700 hover:text-slate-950 rounded-full backdrop-blur border border-slate-200 shadow-soft transition-colors cursor-pointer"
            title="Share turf link"
            id="detail-share-btn"
          >
            {copied ? <Check className="w-4 h-4 text-[#0FA958]" /> : <Share2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setSelectedTurf(null)}
            className="p-2.5 bg-white/90 hover:bg-white text-slate-700 hover:text-slate-950 rounded-full backdrop-blur border border-slate-200 shadow-soft transition-colors cursor-pointer"
            id="detail-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image Gallery Showcase */}
        <div className="relative h-64 sm:h-80 w-full bg-slate-100">
          <img
            src={selectedTurf.images[activeImageIndex] || selectedTurf.images[0]}
            alt={selectedTurf.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20" />

          {/* Floating Badges */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <VerifiedBadge tier={selectedTurf.verifiedBadge} size="md" />
            <span className="bg-white/95 backdrop-blur text-slate-800 text-xs font-semibold px-3 py-1 rounded-full border border-slate-200 shadow-2xs flex items-center gap-1.5">
              {selectedTurf.venueType === 'indoor' ? (
                <>
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Indoor Cage</span>
                </>
              ) : selectedTurf.venueType === 'rooftop' ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Rooftop Arena</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#0FA958]" />
                  <span>Outdoor Turf</span>
                </>
              )}
            </span>
          </div>

          {/* Image Selectors */}
          {selectedTurf.images.length > 1 && (
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 overflow-x-auto pb-1">
              {selectedTurf.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-[#0FA958] scale-105 shadow-md'
                      : 'border-white/50 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="Thumbnail" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-8 max-h-[60vh] overflow-y-auto">
          {/* Main Info */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="bg-emerald-50 border border-emerald-200 text-[#064E3B] text-xs font-bold px-2.5 py-0.5 rounded-full">
                {selectedTurf.city}
              </span>
              <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-slate-200">
                {selectedTurf.size}
              </span>
              <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-slate-200">
                {selectedTurf.surface}
              </span>
              <span className="bg-emerald-50 border border-emerald-200 text-[#064E3B] text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 ml-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0FA958] animate-pulse" />
                <span>Live Availability Open</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight mb-2">
              {selectedTurf.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748B]">
              <div className="flex items-center gap-1 text-amber-600 font-bold">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{selectedTurf.rating > 0 ? selectedTurf.rating.toFixed(1) : 'New'}</span>
                <span className="text-[#64748B] font-normal">({selectedTurf.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-[#0FA958]" />
                <span>{selectedTurf.address}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-[#0FA958]" />
                <span>{selectedTurf.openingTime} - {selectedTurf.closingTime} (Daily)</span>
              </div>
            </div>

            {/* Distance & Map Directions Banner */}
            <div className="mt-3.5 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#064E3B] flex items-center justify-center">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                    {distanceFormatted ? (
                      <>
                        <span>{distanceFormatted} away</span>
                        {driveTime && <span className="text-[#64748B] font-normal">({driveTime} min estimated drive)</span>}
                      </>
                    ) : (
                      <span>Location: {selectedTurf.area}, {selectedTurf.city}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#64748B] font-mono">
                    Lat: {selectedTurf.latitude.toFixed(4)}, Lng: {selectedTurf.longitude.toFixed(4)}
                  </div>
                </div>
              </div>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#064E3B] border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                id="open-google-maps-btn"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Quick Stat Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Regular Rate</div>
              <div className="text-lg font-black text-[#064E3B] font-mono">
                BDT {selectedTurf.hourlyRate.toLocaleString()}
                <span className="text-xs text-[#64748B] font-normal">/hr</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Peak Hour Rate</div>
              <div className="text-lg font-black text-amber-600 font-mono">
                BDT {(selectedTurf.peakHourRate || selectedTurf.hourlyRate).toLocaleString()}
                <span className="text-xs text-[#64748B] font-normal">/hr</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Venue Capacity</div>
              <div className="text-sm font-bold text-[#0F172A] mt-1">{selectedTurf.size}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Manager Contact</div>
              <div className="text-xs font-semibold text-slate-800 mt-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-[#0FA958]" />
                <span>{selectedTurf.ownerPhone}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] mb-2">About The Arena</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {selectedTurf.description}
            </p>
          </div>

          {/* Amenities Grid */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] mb-3">
              Included Amenities &amp; Facilities
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {selectedTurf.amenities.map((amenity, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center gap-2.5 text-xs text-slate-800"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-[#064E3B] flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Arena Rules */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 sm:p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-600" /> Arena Guidelines &amp; Rules
            </h3>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
              <li>Only rubber turf trainers (TF studs) or flat indoor shoes allowed. <strong>Strictly no metal studs</strong> to protect turf fibers.</li>
              <li>Teams must arrive 10 minutes prior to booked slot time.</li>
              <li>Advance token payment (BDT 1,000) confirms slot booking; remainder paid on field.</li>
              <li>Complimentary bibs and match football/tape balls provided upon check-in at reception.</li>
            </ul>
          </div>

          {/* Reviews Section */}
          <div>
            <ReviewSection turfId={selectedTurf.id} turfName={selectedTurf.name} />
          </div>
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="p-4 sm:p-6 bg-white border-t border-slate-200 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Starting from</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#064E3B] font-mono">BDT {selectedTurf.hourlyRate.toLocaleString()}</span>
              <span className="text-xs text-[#64748B]">/hour</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedTurf(null)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Back to Browse
            </button>
            <button
              onClick={handleBookClick}
              className="px-6 py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
              id="detail-book-now-btn"
            >
              <Calendar className="w-4 h-4" />
              <span>Select Slot &amp; Book</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
