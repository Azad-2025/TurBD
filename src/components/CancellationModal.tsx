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
        notes: fullReason,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      id="cancellation-request-modal"
    >
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5 my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3 pt-1">
          <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Request Match Cancellation</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Pass #{booking.bookingCode} • {booking.turfName}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Refund Policy Box */}
        <div className="p-4 rounded-2xl bg-neutral-850 border border-neutral-800 space-y-2.5 text-xs">
          <div className="font-bold text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>TurfBD Standard Refund Policy</span>
          </div>
          <ul className="space-y-1.5 text-neutral-300 text-[11px] list-disc list-inside">
            <li>
              Cancellations requested <strong className="text-white">6+ hours before kickoff</strong> qualify for 100% advance refund (৳{booking.advancePaid}).
            </li>
            <li>
              Requests within 6 hours are reviewed directly by the arena manager.
            </li>
            <li>
              Refunds are dispatched back to your registered <strong className="text-emerald-400">{booking.paymentMethod.toUpperCase()}</strong> wallet.
            </li>
          </ul>
          <div className="border-t border-neutral-800 pt-2 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Advance Token to Refund:</span>
            <span className="font-mono font-bold text-emerald-400">৳{booking.advancePaid.toLocaleString()}</span>
          </div>
        </div>

        <form onSubmit={handleConfirmCancellation} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Reason for Cancellation
            </label>
            <div className="space-y-1.5">
              {CANCELLATION_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedReason === r
                      ? 'bg-neutral-800 border-emerald-500/60 text-white font-semibold'
                      : 'bg-neutral-850 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancellationReason"
                    value={r}
                    checked={selectedReason === r}
                    onChange={() => setSelectedReason(r)}
                    className="accent-emerald-500"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Additional Details / Comments (Optional)
            </label>
            <textarea
              rows={2}
              value={customExplanation}
              onChange={(e) => setCustomExplanation(e.target.value)}
              placeholder="Provide any additional context for the turf owner..."
              className="w-full bg-neutral-850 border border-neutral-700 rounded-xl p-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Keep My Booking
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
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
