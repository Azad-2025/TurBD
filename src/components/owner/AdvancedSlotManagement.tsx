import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Turf, Slot } from '../../types';
import {
  Calendar,
  Clock,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Zap,
  Info,
  CalendarDays,
  Shield,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AdvancedSlotManagementProps {
  turfs: Turf[];
  selectedTurfId?: string | number;
  onSelectTurf?: (turfId: string) => void;
  currentUser?: any;
}

export const AdvancedSlotManagement: React.FC<AdvancedSlotManagementProps> = ({
  turfs,
  selectedTurfId: initialTurfId,
  onSelectTurf,
  currentUser,
}) => {
  const [selectedTurfId, setSelectedTurfId] = useState<string>(
    String(initialTurfId || turfs[0]?.id || '')
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Single Slot Block/Unblock Modal
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);
  const [blockReason, setBlockReason] = useState('Pitch Maintenance');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<any | null>(null);

  // Bulk / Date Range Block Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkMode, setBulkMode] = useState<'day' | 'range' | 'selected'>('day');
  const [bulkStartDate, setBulkStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkEndDate, setBulkEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkReason, setBulkReason] = useState('Pitch Maintenance');
  const [selectedSlotTimes, setSelectedSlotTimes] = useState<string[]>([]);

  useEffect(() => {
    if (initialTurfId && String(initialTurfId) !== selectedTurfId) {
      setSelectedTurfId(String(initialTurfId));
    }
  }, [initialTurfId]);

  const loadSlots = async () => {
    if (!selectedTurfId) return;
    setIsLoading(true);
    setConflictWarning(null);
    try {
      const data = await api.getSlots(selectedTurfId, selectedDate);
      setSlots(data || []);
      setSelectedSlotTimes([]);
    } catch (err: any) {
      console.error('Failed to load slots:', err);
      setStatusMessage({ text: 'Failed to load slots for this date', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [selectedTurfId, selectedDate]);

  const handleTurfSelect = (id: string) => {
    setSelectedTurfId(id);
    if (onSelectTurf) onSelectTurf(id);
  };

  const handleSingleSlotAction = async (overrideConflict = false) => {
    if (!activeSlot || !selectedTurfId) return;
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const finalReason = blockReason === 'Other' ? customReason : blockReason;
      const willBlock = !activeSlot.isBlocked;

      if (willBlock) {
        await api.blockSlotsBulk(
          selectedTurfId,
          [{ date: selectedDate, startTime: activeSlot.startTime }],
          finalReason,
          overrideConflict
        );
        setStatusMessage({
          text: `Slot ${activeSlot.startTime}-${activeSlot.endTime} blocked successfully.`,
          type: 'success',
        });
      } else {
        await api.unblockSlots(selectedTurfId, {
          slots: [{ date: selectedDate, startTime: activeSlot.startTime }],
        });
        setStatusMessage({
          text: `Slot ${activeSlot.startTime}-${activeSlot.endTime} unblocked.`,
          type: 'success',
        });
      }

      setActiveSlot(null);
      setConflictWarning(null);
      await loadSlots();
    } catch (err: any) {
      if (err.conflict) {
        setConflictWarning(err);
      } else {
        console.error('Slot action failed:', err);
        setStatusMessage({
          text: err.message || 'Action failed on slot',
          type: 'error',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkBlock = async (action: 'block' | 'unblock', overrideConflict = false) => {
    if (!selectedTurfId) return;
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const isBlocking = action === 'block';

      if (!isBlocking) {
        // UNBLOCK
        if (bulkMode === 'selected') {
          if (selectedSlotTimes.length === 0) {
            setStatusMessage({ text: 'No slots selected for bulk action', type: 'error' });
            setIsSubmitting(false);
            return;
          }
          await api.unblockSlots(selectedTurfId, {
            slots: selectedSlotTimes.map((t) => ({ date: selectedDate, startTime: t })),
          });
          setStatusMessage({
            text: `Unblocked ${selectedSlotTimes.length} slot(s) successfully.`,
            type: 'success',
          });
        } else if (bulkMode === 'day') {
          await api.unblockSlots(selectedTurfId, { date: selectedDate });
          setStatusMessage({
            text: `Entire day ${selectedDate} unblocked.`,
            type: 'success',
          });
        }
      } else {
        // BLOCK
        if (bulkMode === 'selected') {
          if (selectedSlotTimes.length === 0) {
            setStatusMessage({ text: 'No slots selected for bulk action', type: 'error' });
            setIsSubmitting(false);
            return;
          }
          await api.blockSlotsBulk(
            selectedTurfId,
            selectedSlotTimes.map((t) => ({ date: selectedDate, startTime: t })),
            bulkReason,
            overrideConflict
          );
          setStatusMessage({
            text: `Blocked ${selectedSlotTimes.length} slot(s) successfully.`,
            type: 'success',
          });
        } else if (bulkMode === 'day') {
          await api.blockSlotDay(selectedTurfId, selectedDate, bulkReason, overrideConflict);
          setStatusMessage({
            text: `Entire day ${selectedDate} blocked successfully.`,
            type: 'success',
          });
        } else if (bulkMode === 'range') {
          await api.blockSlotRange(
            selectedTurfId,
            bulkStartDate,
            bulkEndDate,
            bulkReason,
            overrideConflict
          );
          setStatusMessage({
            text: `Date range ${bulkStartDate} to ${bulkEndDate} blocked successfully.`,
            type: 'success',
          });
        }
      }

      setShowBulkModal(false);
      setConflictWarning(null);
      await loadSlots();
    } catch (err: any) {
      if (err.conflict) {
        setConflictWarning(err);
      } else {
        console.error('Bulk slot action failed:', err);
        setStatusMessage({
          text: err.message || 'Failed to perform bulk slot action',
          type: 'error',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelectSlotTime = (startTime: string) => {
    setSelectedSlotTimes((prev) =>
      prev.includes(startTime) ? prev.filter((t) => t !== startTime) : [...prev, startTime]
    );
  };

  const currentTurf = turfs.find((t) => String(t.id) === String(selectedTurfId));

  return (
    <div className="space-y-6">
      {/* Top Banner & Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Select Arena
            </label>
            <select
              value={selectedTurfId}
              onChange={(e) => handleTurfSelect(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#0FA958]"
            >
              {turfs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.city || 'Dhaka'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Schedule Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#0FA958]"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => loadSlots()}
            disabled={isLoading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
            title="Refresh Slots"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => {
              setBulkMode('day');
              setShowBulkModal(true);
            }}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <CalendarDays size={14} />
            Block Full Day
          </button>

          <button
            onClick={() => {
              setBulkMode('range');
              setShowBulkModal(true);
            }}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Layers size={14} />
            Date Range Block
          </button>

          {selectedSlotTimes.length > 0 && (
            <button
              onClick={() => {
                setBulkMode('selected');
                setShowBulkModal(true);
              }}
              className="px-3.5 py-2 bg-[#0FA958] hover:bg-[#0D944D] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Lock size={14} />
              Action on {selectedSlotTimes.length} Selected
            </button>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Legend & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500"></span>
            <span className="text-slate-700 font-medium">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-500"></span>
            <span className="text-slate-700 font-medium">Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500"></span>
            <span className="text-slate-700 font-medium">Blocked / Maintenance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500"></span>
            <span className="text-slate-700 font-medium">Held (Cart Checkout)</span>
          </div>
        </div>

        {currentTurf && (
          <div className="text-slate-500 text-[11px]">
            Base: <span className="text-slate-900 font-bold">BDT {currentTurf.hourlyRate || currentTurf.pricePerHour}/hr</span>
            {currentTurf.dayPricePerHour && (
              <span className="ml-2">
                Day: <span className="text-amber-700 font-bold">BDT {currentTurf.dayPricePerHour}</span>
              </span>
            )}
            {currentTurf.nightPricePerHour && (
              <span className="ml-2">
                Night: <span className="text-indigo-700 font-bold">BDT {currentTurf.nightPricePerHour}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Slots Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-card">
          <RefreshCw className="animate-spin mx-auto mb-3 text-[#0FA958]" size={28} />
          <p className="text-xs">Loading slots for {selectedDate}...</p>
        </div>
      ) : slots.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-card">
          <Calendar className="mx-auto mb-3 opacity-30 text-slate-400" size={32} />
          <p className="text-xs font-bold text-slate-900">No slots available for this date</p>
          <p className="text-[11px] text-slate-500 mt-1">Slots are dynamically scheduled based on operational hours.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {slots.map((slot) => {
            const isSelected = selectedSlotTimes.includes(slot.startTime);
            const isBooked = slot.isBooked;
            const isBlocked = slot.isBlocked;
            const isHeld = (slot as any).isHeld;

            let cardBg = 'bg-white border-slate-200 hover:border-slate-300 shadow-sm';
            let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            let statusText = 'Available';

            if (isBooked) {
              cardBg = 'bg-blue-50/50 border-blue-200';
              badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
              statusText = 'Booked';
            } else if (isBlocked) {
              cardBg = 'bg-rose-50/50 border-rose-200';
              badgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
              statusText = 'Blocked';
            } else if (isHeld) {
              cardBg = 'bg-amber-50/50 border-amber-200';
              badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
              statusText = 'Held';
            }

            if (isSelected) {
              cardBg = 'bg-emerald-50 border-[#0FA958] ring-2 ring-[#0FA958]/20 shadow-md';
            }

            return (
              <div
                key={slot.id}
                className={`relative rounded-xl border p-3 flex flex-col justify-between transition-all ${cardBg}`}
              >
                {/* Header: Time & Select Checkbox */}
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1 text-slate-900 font-bold text-xs">
                    <Clock size={12} className="text-slate-400" />
                    <span>{slot.startTime}</span>
                  </div>

                  {!isBooked && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectSlotTime(slot.startTime)}
                      className="rounded border-slate-300 text-[#0FA958] focus:ring-0 cursor-pointer"
                      title="Select for bulk action"
                    />
                  )}
                </div>

                <div className="text-[10px] text-slate-500 mb-2">to {slot.endTime}</div>

                {/* Price and Dynamic Rules */}
                <div className="mb-2">
                  <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>BDT {slot.price}</span>
                    {slot.isPeakHour && (
                      <span className="text-[9px] text-amber-600 flex items-center gap-0.5 bg-amber-50 px-1 py-0.5 rounded font-bold">
                        <Zap size={9} /> Peak
                      </span>
                    )}
                  </div>
                  {slot.appliedRuleName && (
                    <div className="text-[10px] text-indigo-600 truncate font-medium" title={slot.appliedRuleName}>
                      {slot.appliedRuleName}
                    </div>
                  )}
                </div>

                {/* Block reason if blocked */}
                {isBlocked && (
                  <div
                    className="text-[10px] text-rose-700 bg-rose-100/60 px-1.5 py-1 rounded mb-2 border border-rose-200 truncate"
                    title={slot.blockReason || 'Blocked by owner'}
                  >
                    <Shield size={10} className="inline mr-1" />
                    {slot.blockReason || 'Maintenance'}
                  </div>
                )}

                {/* Status and Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${badgeBg}`}>
                    {statusText}
                  </span>

                  {!isBooked ? (
                    <button
                      onClick={() => {
                        setConflictWarning(null);
                        setActiveSlot(slot);
                      }}
                      className={`p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        isBlocked
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      }`}
                      title={isBlocked ? 'Unblock slot' : 'Block slot'}
                    >
                      {isBlocked ? <Unlock size={12} /> : <Lock size={12} />}
                    </button>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-medium">Locked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SINGLE SLOT BLOCK/UNBLOCK MODAL */}
      {activeSlot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 text-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <div className="flex items-center gap-2">
                {activeSlot.isBlocked ? (
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                    <Unlock size={18} />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
                    <Lock size={18} />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {activeSlot.isBlocked ? 'Unblock Slot' : 'Block Slot for Maintenance'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedDate} • {activeSlot.startTime} – {activeSlot.endTime}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveSlot(null);
                  setConflictWarning(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {conflictWarning && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle size={15} />
                  <span>Existing Booking Detected</span>
                </div>
                <p>
                  This slot has {conflictWarning.conflictingBookings?.length || 1} existing booking(s). Blocking will prevent new reservations, but you must confirm if you want to proceed.
                </p>
                <button
                  onClick={() => handleSingleSlotAction(true)}
                  disabled={isSubmitting}
                  className="w-full mt-2 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  Force Block Despite Existing Booking
                </button>
              </div>
            )}

            {activeSlot.isBlocked ? (
              <div className="space-y-4">
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-900">
                  <p className="font-semibold mb-1">Currently Blocked:</p>
                  <p>Reason: <span className="font-bold">{activeSlot.blockReason || 'Pitch Maintenance'}</span></p>
                  {activeSlot.blockedAt && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Blocked at: {new Date(activeSlot.blockedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  Unblocking this slot will immediately make it bookable for customers on TurfBD.
                </p>
                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    onClick={() => setActiveSlot(null)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSingleSlotAction()}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {isSubmitting ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Unlock size={14} />
                    )}
                    Confirm Unblock
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Reason for Blocking
                  </label>
                  <select
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0FA958]"
                  >
                    <option value="Pitch Maintenance">Pitch Maintenance & Turf Repairs</option>
                    <option value="Private Event">Private Owner Event / Friendly Match</option>
                    <option value="Severe Weather">Inclement / Severe Weather</option>
                    <option value="Floodlight Repairs">Floodlight / Electrical Issue</option>
                    <option value="Other">Other Custom Reason</option>
                  </select>
                </div>

                {blockReason === 'Other' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Custom Note / Reason
                    </label>
                    <input
                      type="text"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="e.g. Grass reseeding"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0FA958]"
                    />
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <Info size={15} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Blocked slots immediately become unbookable to players online.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    onClick={() => setActiveSlot(null)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSingleSlotAction()}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {isSubmitting ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Lock size={14} />
                    )}
                    Confirm Block
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BULK / DATE RANGE MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 text-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {bulkMode === 'day'
                    ? `Full Day Operations (${selectedDate})`
                    : bulkMode === 'range'
                    ? 'Date Range Slot Operations'
                    : `Bulk Action on ${selectedSlotTimes.length} Selected Slots`}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Perform coordinated block/unblock actions across multiple slots.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setConflictWarning(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {conflictWarning && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle size={15} />
                  <span>Conflict Warning</span>
                </div>
                <p>
                  Some requested slots have existing reservations. Do you want to force block anyway?
                </p>
                <button
                  onClick={() => handleBulkBlock('block', true)}
                  disabled={isSubmitting}
                  className="w-full mt-2 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  Force Block Despite Conflicts
                </button>
              </div>
            )}

            <div className="space-y-4">
              {bulkMode === 'range' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={bulkStartDate}
                      onChange={(e) => setBulkStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={bulkEndDate}
                      onChange={(e) => setBulkEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Maintenance / Operation Reason
                </label>
                <select
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0FA958]"
                >
                  <option value="Pitch Maintenance">Pitch Maintenance & Turf Grass Care</option>
                  <option value="Private Tournament">Private Tournament / Event Booking</option>
                  <option value="Facility Upgrade">Facility Upgrade & Lighting Repairs</option>
                  <option value="Severe Weather">Adverse Weather Closure</option>
                </select>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-800">
                <p className="font-semibold mb-0.5">Booking Protection Notice:</p>
                <p>
                  Any existing confirmed bookings will not be silently deleted. The system validates and checks for overlaps.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  onClick={() => setShowBulkModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkBlock('unblock')}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Unlock size={14} />
                    )}
                    Bulk Unblock
                  </button>

                  <button
                    onClick={() => handleBulkBlock('block')}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {isSubmitting ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Lock size={14} />
                    )}
                    Bulk Block
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
