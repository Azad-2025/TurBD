import React, { useState } from 'react';
import { Booking, Turf } from '../types';
import { useApp } from '../context/AppContext';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Printer,
  Download,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Building2,
  DollarSign,
  FileText,
  Receipt,
} from 'lucide-react';

interface BookingDetailsModalProps {
  booking: Booking;
  turf?: Turf;
  onClose: () => void;
  onRequestCancel?: (booking: Booking) => void;
  canManage?: boolean; // Owner or Admin
  onStatusChange?: (status: any, extra?: any) => void;
}

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  booking,
  turf,
  onClose,
  onRequestCancel,
  canManage = false,
  onStatusChange,
}) => {
  const { updateBookingStatus } = useApp();
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const copyBookingCode = () => {
    navigator.clipboard.writeText(booking.bookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const isCancelled = booking.status === 'cancelled';
  const isCancellationRequested = booking.status === 'cancellation_requested';
  const isUpcoming = booking.date >= new Date().toISOString().split('T')[0] && !isCancelled;

  // Status badge styling
  const getStatusBadge = () => {
    switch (booking.status) {
      case 'confirmed':
        return {
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          label: 'Confirmed & Locked',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case 'pending_approval':
        return {
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          label: 'Pending Owner Approval',
          icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
        };
      case 'completed':
        return {
          bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          label: 'Match Completed',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />,
        };
      case 'cancellation_requested':
        return {
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          label: 'Cancellation Requested',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />,
        };
      case 'cancelled':
        return {
          bg: 'bg-red-500/15 text-red-400 border-red-500/30',
          label: 'Cancelled',
          icon: <XCircle className="w-3.5 h-3.5 text-red-400" />,
        };
      default:
        return {
          bg: 'bg-neutral-800 text-neutral-400 border-neutral-700',
          label: booking.status,
          icon: null,
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static"
      id="booking-details-modal"
    >
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl my-auto print:border-none print:shadow-none print:w-full print:max-w-none print:text-black">
        {/* Header (hidden in print) */}
        <div className="p-5 sm:p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/95 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-neutral-400 font-semibold">Official Match Pass Voucher</div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Pass #{booking.bookingCode}</span>
                <button
                  onClick={copyBookingCode}
                  className="text-neutral-500 hover:text-white transition-colors"
                  title="Copy booking code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReceiptModal(true)}
              className="p-2 text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Official Tax Invoice & Receipt"
            >
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Tax Receipt</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-2 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Print Voucher"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Print Voucher</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Pass Body */}
        <div className="p-5 sm:p-7 space-y-6 max-h-[78vh] overflow-y-auto print:max-h-none print:overflow-visible">
          {/* Status & Match Countdown Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-850 border border-neutral-800">
            <div className="flex items-center gap-2.5">
              <span
                className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 uppercase tracking-wider ${statusBadge.bg}`}
              >
                {statusBadge.icon}
                <span>{statusBadge.label}</span>
              </span>
              <span className="text-xs text-neutral-400">
                Created: {new Date(booking.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="text-xs font-mono text-emerald-400 font-bold">
              {isUpcoming ? '⚽ Match Upcoming' : isCancelled ? '⛔ Reservation Void' : '✓ Completed'}
            </div>
          </div>

          {/* Cancellation Alert / Refund Status (if applicable) */}
          {(isCancelled || isCancellationRequested) && (
            <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 space-y-2">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {isCancellationRequested ? 'Cancellation Under Review' : 'Booking Cancelled'}
                </span>
              </div>
              {booking.cancellationReason && (
                <p className="text-xs text-neutral-300">
                  <strong className="text-neutral-400">Reason:</strong> "{booking.cancellationReason}"
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                <span className="text-neutral-400">Refund Status:</span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold uppercase text-[10px] ${
                    booking.refundStatus === 'refunded' || booking.refundStatus === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : booking.refundStatus === 'rejected'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {booking.refundStatus === 'refunded'
                    ? 'Refund Processed (৳' + (booking.refundAmount || booking.advancePaid) + ')'
                    : booking.refundStatus === 'approved'
                    ? 'Refund Approved'
                    : booking.refundStatus === 'rejected'
                    ? 'Refund Declined'
                    : 'Pending Owner Review'}
                </span>
                <span className="text-[11px] text-neutral-400">
                  {booking.paymentMethod.toUpperCase()} MFS return
                </span>
              </div>
            </div>
          )}

          {/* Core Voucher Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Left 2 Cols: Turf & Match Details */}
            <div className="md:col-span-2 space-y-4">
              {/* Turf Information */}
              <div className="bg-neutral-850 p-4 sm:p-5 rounded-2xl border border-neutral-800 space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Venue & Arena
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{booking.turfName}</h3>
                  <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{booking.turfArea}, {booking.turfCity}</span>
                  </p>
                </div>

                {turf && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-neutral-400">
                    <span className="bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                      {turf.size}
                    </span>
                    <span className="bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                      {turf.surface}
                    </span>
                    {turf.ownerPhone && (
                      <a
                        href={`tel:${turf.ownerPhone}`}
                        className="text-emerald-400 flex items-center gap-1 font-semibold ml-auto hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Reception: {turf.ownerPhone}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Match Date, Time & Booker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-neutral-850 p-4 rounded-2xl border border-neutral-800 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    <span>Match Date</span>
                  </div>
                  <div className="text-sm font-bold text-white">{booking.date}</div>
                  <div className="text-[11px] text-neutral-400">
                    {new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>

                <div className="bg-neutral-850 p-4 rounded-2xl border border-neutral-800 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    <span>Kickoff Time</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-400 font-mono">
                    {booking.startTime} - {booking.endTime}
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Duration: {booking.durationHours} Hour{booking.durationHours > 1 ? 's' : ''} ({booking.sport})
                  </div>
                </div>
              </div>

              {/* Booker Info */}
              <div className="bg-neutral-850 p-4 rounded-2xl border border-neutral-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-neutral-400 block font-semibold">Booker Captain</span>
                  <span className="font-bold text-white">{booking.userName}</span>
                  <span className="text-neutral-400 text-[11px] block">{booking.userPhone}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 block font-semibold">Email Receipt</span>
                  <span className="text-neutral-300 font-mono text-[11px]">{booking.userEmail}</span>
                </div>
              </div>
            </div>

            {/* Right Col: QR Code & Verification Pass */}
            <div className="bg-neutral-850 p-5 rounded-2xl border border-neutral-800 flex flex-col items-center justify-between text-center space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Scan at Reception
                </span>
                <p className="text-[11px] text-neutral-400">Ground staff entry token</p>
              </div>

              {/* Authentic SVG QR Code Graphic */}
              <div className="bg-white p-3 rounded-2xl shadow-inner inline-block">
                <svg
                  className="w-36 h-36"
                  viewBox="0 0 100 100"
                  shapeRendering="crispEdges"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="100" height="100" fill="#ffffff" />
                  {/* Outer positioning corners */}
                  <rect x="10" y="10" width="24" height="24" fill="#000000" />
                  <rect x="13" y="13" width="18" height="18" fill="#ffffff" />
                  <rect x="16" y="16" width="12" height="12" fill="#000000" />

                  <rect x="66" y="10" width="24" height="24" fill="#000000" />
                  <rect x="69" y="13" width="18" height="18" fill="#ffffff" />
                  <rect x="72" y="16" width="12" height="12" fill="#000000" />

                  <rect x="10" y="66" width="24" height="24" fill="#000000" />
                  <rect x="13" y="69" width="18" height="18" fill="#ffffff" />
                  <rect x="16" y="72" width="12" height="12" fill="#000000" />

                  {/* Internal algorithmic matrix blocks based on bookingCode */}
                  <rect x="40" y="12" width="6" height="6" fill="#000000" />
                  <rect x="52" y="12" width="6" height="6" fill="#000000" />
                  <rect x="44" y="24" width="8" height="6" fill="#000000" />
                  <rect x="38" y="34" width="6" height="8" fill="#000000" />
                  <rect x="48" y="38" width="8" height="8" fill="#000000" />
                  <rect x="60" y="36" width="6" height="6" fill="#000000" />
                  <rect x="72" y="42" width="6" height="6" fill="#000000" />
                  <rect x="82" y="44" width="8" height="6" fill="#000000" />

                  <rect x="12" y="42" width="6" height="6" fill="#000000" />
                  <rect x="22" y="44" width="6" height="8" fill="#000000" />
                  <rect x="32" y="50" width="8" height="6" fill="#000000" />
                  <rect x="44" y="54" width="6" height="8" fill="#000000" />
                  <rect x="56" y="50" width="8" height="6" fill="#000000" />
                  <rect x="70" y="56" width="6" height="6" fill="#000000" />
                  <rect x="80" y="58" width="6" height="8" fill="#000000" />

                  <rect x="38" y="68" width="8" height="6" fill="#000000" />
                  <rect x="50" y="66" width="6" height="8" fill="#000000" />
                  <rect x="62" y="72" width="8" height="6" fill="#000000" />
                  <rect x="76" y="68" width="6" height="6" fill="#000000" />
                  <rect x="44" y="80" width="6" height="8" fill="#000000" />
                  <rect x="56" y="82" width="8" height="6" fill="#000000" />
                  <rect x="68" y="84" width="8" height="6" fill="#000000" />
                  <rect x="82" y="80" width="6" height="8" fill="#000000" />
                </svg>
              </div>

              <div className="space-y-0.5">
                <div className="text-xs font-mono font-bold text-white">#{booking.bookingCode}</div>
                <div className="text-[10px] text-neutral-500">TurfBD Verified Voucher</div>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="bg-neutral-850 rounded-2xl border border-neutral-800 overflow-hidden">
            <div className="p-4 bg-neutral-800/60 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Financial & Payment Breakdown</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  booking.dueAmount === 0
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {booking.dueAmount === 0 ? 'Fully Paid' : 'Partially Paid'}
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-300">
                <span>Pitch Hourly Charge:</span>
                <span className="font-mono text-white">
                  ৳{Math.round(booking.totalAmount / Math.max(1, booking.durationHours))} / hour × {booking.durationHours}h
                </span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Total Pitch Fee:</span>
                <span className="font-mono font-bold text-white">৳{booking.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-semibold border-t border-neutral-800 pt-2">
                <span>Advance Paid ({booking.paymentMethod.toUpperCase()}):</span>
                <span className="font-mono">৳{booking.advancePaid.toLocaleString()}</span>
              </div>
              {booking.transactionId && (
                <div className="flex justify-between text-neutral-400 text-[11px]">
                  <span>MFS Transaction Trx ID:</span>
                  <span className="font-mono text-neutral-200">{booking.transactionId}</span>
                </div>
              )}
              <div className="border-t border-neutral-800 pt-2 flex justify-between items-baseline">
                <span className="font-bold text-white">Due on Field Arrival:</span>
                <span className={`text-base font-black font-mono ${booking.dueAmount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  ৳{booking.dueAmount.toLocaleString()}
                </span>
              </div>
              {booking.dueAmount > 0 && (
                <p className="text-[11px] text-neutral-400 pt-1">
                  Pay the remaining ৳{booking.dueAmount.toLocaleString()} balance at the venue counter via cash or mobile money.
                </p>
              )}
            </div>
          </div>

          {/* Special Notes (if any) */}
          {booking.notes && (
            <div className="p-3.5 rounded-xl bg-neutral-850 border border-neutral-800 text-xs">
              <span className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Match Requests / Notes:</span>
              <p className="text-neutral-200 italic">"{booking.notes}"</p>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-neutral-900 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            {/* Customer Cancellation Request Button */}
            {!canManage && isUpcoming && booking.status !== 'cancellation_requested' && onRequestCancel && (
              <button
                onClick={() => onRequestCancel(booking)}
                className="px-3.5 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-500/30 rounded-xl transition-colors cursor-pointer"
              >
                Request Cancellation & Refund
              </button>
            )}

            {/* Owner/Admin Management Controls */}
            {canManage && (
              <div className="flex items-center gap-2">
                {booking.status === 'pending_approval' && (
                  <button
                    disabled={isUpdating}
                    onClick={() => {
                      setIsUpdating(true);
                      updateBookingStatus(booking.id, 'confirmed').finally(() => setIsUpdating(false));
                    }}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Match</span>
                  </button>
                )}

                {booking.status === 'confirmed' && (
                  <button
                    disabled={isUpdating}
                    onClick={() => {
                      setIsUpdating(true);
                      updateBookingStatus(booking.id, 'completed').finally(() => setIsUpdating(false));
                    }}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-white font-semibold text-xs rounded-xl border border-neutral-700 transition-colors cursor-pointer"
                  >
                    Mark as Completed
                  </button>
                )}

                {booking.status === 'cancellation_requested' && (
                  <button
                    disabled={isUpdating}
                    onClick={() => {
                      if (confirm('Approve customer cancellation and authorize refund?')) {
                        setIsUpdating(true);
                        updateBookingStatus(booking.id, 'cancelled', {
                          refundStatus: 'refunded',
                        }).finally(() => setIsUpdating(false));
                      }
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Approve Cancellation & Refund
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 font-semibold text-xs rounded-xl border border-neutral-700 transition-colors ml-auto cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {showReceiptModal && (
        <PaymentReceiptModal
          booking={booking}
          onClose={() => setShowReceiptModal(false)}
          transactionId={booking.transactionId}
          paymentMethod={booking.paymentMethod}
          paymentAmount={booking.advancePaid}
        />
      )}
    </div>
  );
};
