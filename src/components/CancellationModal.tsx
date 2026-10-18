import React, { useState } from 'react';
import { Booking } from '../types';
import { useApp } from '../context/AppContext';
import {
  X,
  AlertTriangle,
  Clock,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface CancellationModalProps {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
}

const CANCELLATION_REASONS = [
  'Rain or Adverse Weather Conditions',
  'Team Shortage / Player Injury',
  'Personal Emergency or Schedule Conflict',
  'Booked Wrong Time Slot / Arena Accidentally',
  'Shifted Match to Different Venue',
  'Other Reason',
];

export const CancellationModal: React.FC<CancellationModalProps> = ({
  booking,
  onClose,
  onSuccess,
}) => {
  const { updateBookingStatus } = useApp();
  const [selectedReason, setSelectedReason] = useState(CANCELLATION_REASONS[0]);
  const [customExplanation, setCustomExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate dynamic hours until match kickoff
  const matchDateTime = new Date(`${booking.date}T${booking.startTime.padStart(5, '0')}:00`);
  const now = new Date();
  const diffMs = matchDateTime.getTime() - now.getTime();
  const rawHoursUntilKickoff = diffMs / (1000 * 60 * 60);
  const hoursUntilKickoff = Math.max(0, Math.round(rawHoursUntilKickoff * 10) / 10);

  // Dynamic 3-tier refund calculation based on Bangladesh Arena Policy
  let refundTier: 'full' | 'half' | 'discretionary' = 'full';
  let refundPercent = 100;

  if (rawHoursUntilKickoff < 2) {
    refundTier = 'discretionary';
    refundPercent = 0;
  } else if (rawHoursUntilKickoff < 6) {
    refundTier = 'half';
    refundPercent = 50;
  }

  const calculatedRefundAmount = Math.round((booking.advancePaid * refundPercent) / 100);
  const cancellationFee = booking.advancePaid - calculatedRefundAmount;

  const handleConfirmCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    const fullReason =
      selectedReason === 'Other Reason' && customExplanation.trim()
        ? customExplanation.trim()
        : customExplanation.trim()
        ? `${selectedReason}: ${customExplanation.trim()}`
        : selectedReason;

    try {
      // Set status to cancellation_requested with refund review info
      await updateBookingStatus(booking.id, 'cancellation_requested', {
        cancellationReason: fullReason,
        refundStatus: 'pending',
        notes: JSON.stringify({
          reason: fullReason,
          hoursUntilKickoff,
          refundPercent,
          calculatedRefundAmount,
          requestedAt: new Date().toISOString(),
        }),
      });

      setIsSubmitting(false);
      onSuccess();
    } catch (err: any) {
      console.error('Failed to submit cancellation request:', err);
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Failed to submit cancellation request');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      id="cancellation-request-modal"
    >
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 my-auto text-[#0F172A]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3 pt-1">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0F172A]">Request Match Cancellation</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pass #{booking.bookingCode} • {booking.turfName}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* Dynamic Refund Policy & Calculation Card */}
        <div className="p-4 rounded-2xl bg-[#F7FAF8] border border-slate-200 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0FA958]" />
              <span>TurfBD Automated Refund Engine</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#0FA958]" />
              <span>{hoursUntilKickoff > 0 ? `${hoursUntilKickoff} hrs to kickoff` : 'Kickoff started'}</span>
            </span>
          </div>

          {/* Refund Policy Tiers Grid */}
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div
              className={`p-2 rounded-xl border ${
                refundTier === 'full'
                  ? 'bg-emerald-50 border-[#0FA958] text-[#064E3B] font-bold shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <div>6+ Hours Prior</div>
              <div className="text-xs font-mono font-bold mt-0.5">100% Refund</div>
            </div>

            <div
              className={`p-2 rounded-xl border ${
                refundTier === 'half'
                  ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <div>2 - 6 Hours</div>
              <div className="text-xs font-mono font-bold mt-0.5">50% Refund</div>
            </div>

            <div
              className={`p-2 rounded-xl border ${
                refundTier === 'discretionary'
                  ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <div>&lt; 2 Hours</div>
              <div className="text-xs font-mono font-bold mt-0.5">Discretionary</div>
            </div>
          </div>

          {/* Calculated Refund Breakdown */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-600">
              <span>Advance Token Deposit:</span>
              <span className="font-mono text-[#0F172A] font-semibold">BDT {booking.advancePaid.toLocaleString()}</span>
            </div>
            {cancellationFee > 0 && (
              <div className="flex items-center justify-between text-slate-600">
                <span>Late Fee / Arena Retainer:</span>
                <span className="font-mono text-rose-600 font-semibold">- BDT {cancellationFee.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between text-xs font-bold">
              <span className="text-[#0F172A]">Estimated Refund Return:</span>
              <span className="font-mono text-[#0FA958] text-sm font-black">
                BDT {calculatedRefundAmount.toLocaleString()} ({refundPercent}%)
              </span>
            </div>
            <div className="text-[10px] text-slate-500 pt-0.5 flex items-center justify-between">
              <span>Payout Destination:</span>
              <span className="font-semibold text-[#064E3B]">
                Registered {booking.paymentMethod.toUpperCase()} MFS Wallet
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleConfirmCancellation} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reason for Cancellation
            </label>
            <div className="space-y-1.5">
              {CANCELLATION_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedReason === r
                      ? 'bg-emerald-50 border-[#0FA958] text-[#064E3B] font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancellationReason"
                    value={r}
                    checked={selectedReason === r}
                    onChange={() => setSelectedReason(r)}
                    className="accent-[#0FA958]"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Additional Details / Comments (Optional)
            </label>
            <textarea
              rows={2}
              value={customExplanation}
              onChange={(e) => setCustomExplanation(e.target.value)}
              placeholder="Provide any additional context for the turf owner..."
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Keep My Booking
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? (
                <span>Submitting Request...</span>
              ) : (
                <span>Submit Cancellation</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
