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
} from 'lucide-react';
import { ReviewSection } from './ReviewSection';

export const TurfDetailModal: React.FC = () => {
  const { selectedTurf, setSelectedTurf, setBookingTurf } = useApp();
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
      id="turf-detail-modal"
    >
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl my-auto">
        {/* Top Header Actions */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2.5 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-full backdrop-blur border border-neutral-700/80 transition-colors cursor-pointer"
            title="Share turf link"
            id="detail-share-btn"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setSelectedTurf(null)}
            className="p-2.5 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-full backdrop-blur border border-neutral-700/80 transition-colors cursor-pointer"
            id="detail-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image Gallery Showcase */}
        <div className="relative h-64 sm:h-80 w-full bg-neutral-950">
          <img
            src={selectedTurf.images[activeImageIndex] || selectedTurf.images[0]}
            alt={selectedTurf.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-black/30" />

          {/* Image Selectors */}
          {selectedTurf.images.length > 1 && (
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 overflow-x-auto pb-1">
              {selectedTurf.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-emerald-500 scale-105 shadow-md shadow-emerald-500/30'
                      : 'border-white/30 opacity-70 hover:opacity-100'
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
              <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {selectedTurf.city}
              </span>
              <span className="bg-neutral-800 text-neutral-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-neutral-700">
                {selectedTurf.size}
              </span>
              <span className="bg-neutral-800 text-neutral-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-neutral-700">
                {selectedTurf.surface}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              {selectedTurf.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400">
              <div className="flex items-center gap-1 text-amber-400 font-bold">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>{selectedTurf.rating > 0 ? selectedTurf.rating.toFixed(1) : 'New'}</span>
                <span className="text-neutral-400 font-normal">({selectedTurf.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>{selectedTurf.address}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>{selectedTurf.openingTime} - {selectedTurf.closingTime} (Daily)</span>
              </div>
            </div>
          </div>

          {/* Quick Stat Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-850 p-4 rounded-2xl border border-neutral-800">
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-400">Regular Rate</div>
              <div className="text-lg font-black text-emerald-400 font-mono">
                ৳{selectedTurf.hourlyRate.toLocaleString()}
                <span className="text-xs text-neutral-400 font-normal">/hr</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-400">Peak Hour Rate</div>
              <div className="text-lg font-black text-amber-400 font-mono">
                ৳{(selectedTurf.peakHourRate || selectedTurf.hourlyRate).toLocaleString()}
                <span className="text-xs text-neutral-400 font-normal">/hr</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-400">Venue Capacity</div>
              <div className="text-sm font-bold text-white mt-1">{selectedTurf.size}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-400">Manager Contact</div>
              <div className="text-xs font-semibold text-neutral-200 mt-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-400" />
                <span>{selectedTurf.ownerPhone}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300 mb-2">About The Arena</h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {selectedTurf.description}
            </p>
          </div>

          {/* Amenities Grid */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300 mb-3">
              Included Amenities & Facilities
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {selectedTurf.amenities.map((amenity, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-850 border border-neutral-800 p-2.5 rounded-xl flex items-center gap-2.5 text-xs text-neutral-200"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Arena Rules */}
          <div className="bg-neutral-850 border border-neutral-800 rounded-2xl p-4 sm:p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 mb-3 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-400" /> Arena Guidelines & Rules
            </h3>
            <ul className="text-xs text-neutral-400 space-y-1.5 list-disc pl-4">
              <li>Only rubber turf trainers (TF studs) or flat indoor shoes allowed. <strong>Strictly no metal studs</strong> to protect turf fibers.</li>
              <li>Teams must arrive 10 minutes prior to booked slot time.</li>
              <li>Advance token payment (৳1,000) confirms slot booking; remainder paid on field.</li>
              <li>Complimentary bibs and match football/tape balls provided upon check-in at reception.</li>
            </ul>
          </div>

          {/* Reviews Section */}
          <div>
            <ReviewSection turfId={selectedTurf.id} turfName={selectedTurf.name} />
          </div>
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="p-4 sm:p-6 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400">Starting from</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-400 font-mono">৳{selectedTurf.hourlyRate.toLocaleString()}</span>
              <span className="text-xs text-neutral-400">/hour</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedTurf(null)}
              className="px-4 py-2.5 text-xs font-semibold text-neutral-300 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
            >
              Back to Browse
            </button>
            <button
              onClick={handleBookClick}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer"
              id="detail-book-now-btn"
            >
              <Calendar className="w-4 h-4" />
              <span>Select Slot & Book</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
