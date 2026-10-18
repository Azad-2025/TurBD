import React, { useState } from 'react';
import { Booking, Turf } from '../types';
import { useApp } from '../context/AppContext';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { SquadCostSplitterModal } from './SquadCostSplitterModal';
import { TurfBDLogo } from './TurfBDLogo';
import { generateSquadShareData, downloadIcsFile } from '../utils/shareUtils';
import { api } from '../services/api';
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
  Share2,
  MessageCircle,
  Navigation,
  CalendarPlus,
  Users,
  Scan,
  QrCode,
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
  const { updateBookingStatus, refreshBookings } = useApp();
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showSplitterModal, setShowSplitterModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState<boolean>(Boolean(booking.isCheckedIn));

  const shareData = generateSquadShareData(booking);

  const copyBookingCode = () => {
    navigator.clipboard.writeText(booking.bookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyShareText = () => {
    navigator.clipboard.writeText(shareData.shareText);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Match Pass: ${booking.turfName}`,
          text: shareData.shareText,
        });
        return;
      } catch (e) {
        // Fall back to clipboard copy
      }
    }
    handleCopyShareText();
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
          bg: 'bg-emerald-50 text-[#064E3B] border-emerald-200',
          label: 'Confirmed & Locked',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#0FA958]" />,
        };
      case 'pending_approval':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          label: 'Pending Owner Approval',
          icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
        };
      case 'completed':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          label: 'Match Completed',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />,
        };
      case 'cancellation_requested':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          label: 'Cancellation Requested',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />,
        };
      case 'cancelled':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          label: 'Cancelled',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          label: booking.status,
          icon: null,
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static"
      id="booking-details-modal"
    >
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl my-auto print:border-none print:shadow-none print:w-full print:max-w-none text-[#0F172A]">
        {/* Header (hidden in print) */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-2xs">
              <TurfBDLogo layout="icon-only" size="md" variant="light" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">Official Match Pass Voucher</div>
              <h2 className="text-lg font-black text-[#0F172A] flex items-center gap-2">
                <span>Pass #{booking.bookingCode}</span>
                <button
                  onClick={copyBookingCode}
                  className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Copy booking code"
                >
                  {copied ? <Check className="w-4 h-4 text-[#0FA958]" /> : <Copy className="w-4 h-4" />}
                </button>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReceiptModal(true)}
              className="p-2 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
              title="Official Tax Invoice & Receipt"
            >
              <Receipt className="w-4 h-4 text-[#0FA958]" />
              <span className="hidden sm:inline">Tax Receipt</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
              title="Print Voucher"
            >
              <Printer className="w-4 h-4 text-[#0FA958]" />
              <span className="hidden sm:inline">Print Voucher</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Pass Body */}
        <div className="p-5 sm:p-7 space-y-6 max-h-[78vh] overflow-y-auto print:max-h-none print:overflow-visible">
          {/* Printable Brand Header */}
          <div className="hidden print:flex items-center justify-between pb-4 border-b border-neutral-300">
            <TurfBDLogo layout="horizontal" size="md" variant="light" showBadge={true} badgeText="Official Pass" />
            <div className="text-right text-xs">
              <p className="font-bold">Pass #{booking.bookingCode}</p>
              <p className="text-neutral-600">{new Date(booking.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Status & Match Countdown Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#F7FAF8] border border-slate-200">
            <div className="flex items-center gap-2.5">
              <span
                className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 uppercase tracking-wider ${statusBadge.bg}`}
              >
                {statusBadge.icon}
                <span>{statusBadge.label}</span>
              </span>
              <span className="text-xs text-slate-500">
                Created: {new Date(booking.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="text-xs font-mono text-[#064E3B] font-bold">
              {isUpcoming ? '⚽ Match Upcoming' : isCancelled ? '⛔ Reservation Void' : '✓ Completed'}
            </div>
          </div>

          {/* Cancellation Alert / Refund Status (if applicable) */}
          {(isCancelled || isCancellationRequested) && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {isCancellationRequested ? 'Cancellation Under Review' : 'Booking Cancelled'}
                </span>
              </div>
              {booking.cancellationReason && (
                <p className="text-xs text-slate-700">
                  <strong className="text-slate-800">Reason:</strong> "{booking.cancellationReason}"
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                <span className="text-slate-600">Refund Status:</span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold uppercase text-[10px] ${
                    booking.refundStatus === 'refunded' || booking.refundStatus === 'approved'
                      ? 'bg-emerald-100 text-[#064E3B]'
                      : booking.refundStatus === 'rejected'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {booking.refundStatus === 'refunded'
                    ? 'Refund Processed (BDT ' + (booking.refundAmount || booking.advancePaid) + ')'
                    : booking.refundStatus === 'approved'
                    ? 'Refund Approved'
                    : booking.refundStatus === 'rejected'
                    ? 'Refund Declined'
                    : 'Pending Owner Review'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {booking.paymentMethod.toUpperCase()} MFS return
                </span>
              </div>
            </div>
          )}

          {/* Squad Invite & Match Sharing Hub (Hidden on print) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#F7FAF8] border border-slate-200 space-y-3 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0FA958]" />
                <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Squad Invite &amp; Match Pass Sharing
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Share pass details with your teammates via WhatsApp or Calendar
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              {/* WhatsApp Share Button */}
              <a
                href={shareData.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#0FA958] hover:bg-[#0d924c] text-white font-bold text-xs shadow-sm transition-all text-center cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>WhatsApp</span>
              </a>

              {/* Squad Cost Splitter Button */}
              <button
                type="button"
                onClick={() => setShowSplitterModal(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#064E3B] font-bold text-xs border border-emerald-200 transition-all text-center cursor-pointer shadow-2xs"
              >
                <Users className="w-4 h-4 text-[#0FA958]" />
                <span>Split Cost</span>
              </button>

              {/* Native / Clipboard Share */}
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs border border-slate-200 transition-all text-center cursor-pointer shadow-2xs"
              >
                {shareCopied ? (
                  <>
                    <Check className="w-4 h-4 text-[#0FA958]" />
                    <span className="text-[#0FA958] font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-slate-600" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {/* Google Calendar Link */}
              <a
                href={shareData.googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs border border-slate-200 transition-all text-center shadow-2xs"
              >
                <CalendarPlus className="w-4 h-4 text-purple-600" />
                <span>Calendar</span>
              </a>

              {/* Download .ICS File */}
              <button
                type="button"
                onClick={() => downloadIcsFile(booking, shareData.icsContent)}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs border border-slate-200 transition-all text-center cursor-pointer shadow-2xs"
                title="Download Apple / Outlook Calendar File"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>.ICS File</span>
              </button>
            </div>

            {/* Direct Google Maps Navigation Bar */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-xs">
              <span className="text-slate-600 text-[11px] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#0FA958]" />
                <span>Directions: {booking.turfArea}, {booking.turfCity}</span>
              </span>
              <a
                href={shareData.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0FA958] hover:text-[#064E3B] font-semibold text-[11px] inline-flex items-center gap-1 hover:underline"
              >
                <Navigation className="w-3 h-3" />
                <span>Open Google Maps</span>
              </a>
            </div>
          </div>

          {/* Core Voucher Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Left 2 Cols: Turf & Match Details */}
            <div className="md:col-span-2 space-y-4">
              {/* Turf Information */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#064E3B]">
                  Venue &amp; Arena
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#0F172A]">{booking.turfName}</h3>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0FA958] shrink-0" />
                    <span>{booking.turfArea}, {booking.turfCity}</span>
                  </p>
                </div>

                {turf && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-600">
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                      {turf.size}
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                      {turf.surface}
                    </span>
                    {turf.ownerPhone && (
                      <a
                        href={`tel:${turf.ownerPhone}`}
                        className="text-[#0FA958] flex items-center gap-1 font-semibold ml-auto hover:underline"
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
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#0FA958]" />
                    <span>Match Date</span>
                  </div>
                  <div className="text-sm font-bold text-[#0F172A]">{booking.date}</div>
                  <div className="text-[11px] text-slate-500">
                    {new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', {
                       weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#0FA958]" />
                    <span>Kickoff Time</span>
                  </div>
                  <div className="text-sm font-bold text-[#064E3B] font-mono">
                    {booking.startTime} - {booking.endTime}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Duration: {booking.durationHours} Hour{booking.durationHours > 1 ? 's' : ''} ({booking.sport})
                  </div>
                </div>
              </div>

              {/* Booker Info */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold">Booker Captain</span>
                  <span className="font-bold text-[#0F172A]">{booking.userName}</span>
                  <span className="text-slate-500 text-[11px] block">{booking.userPhone}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block font-semibold">Email Receipt</span>
                  <span className="text-slate-700 font-mono text-[11px]">{booking.userEmail}</span>
                </div>
              </div>
            </div>

            {/* Right Col: QR Match Pass & Reception Verification Pass */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col items-center justify-between text-center space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#064E3B]">
                  Gate Match Pass
                </span>
                <p className="text-[11px] text-slate-500">Show QR at pitch reception</p>
              </div>

              {/* Authentic SVG QR Code Graphic */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm inline-block relative group">
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
                  <rect x="56" y="82" width="8" height="8" fill="#000000" />
                  <rect x="68" y="84" width="8" height="6" fill="#000000" />
                  <rect x="82" y="80" width="6" height="8" fill="#000000" />
                </svg>

                {/* Overlaid center badge */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[#064E3B] font-black text-[9px]">
                    TBD
                  </div>
                </div>
              </div>

              {/* Check-In State Indicator */}
              <div className="space-y-1.5 w-full">
                <div className="text-xs font-mono font-bold text-[#0F172A]">#{booking.bookingCode}</div>

                {checkInSuccess || booking.isCheckedIn ? (
                  <div className="px-3 py-1 bg-emerald-100 text-[#064E3B] border border-emerald-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0FA958]" />
                    <span>Checked In at Turf</span>
                  </div>
                ) : (
                  <div className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0FA958]" />
                    <span>Ready for Gate Scan</span>
                  </div>
                )}

                {canManage && !booking.isCheckedIn && !checkInSuccess && (
                  <button
                    type="button"
                    disabled={isCheckingIn}
                    onClick={async () => {
                      setIsCheckingIn(true);
                      try {
                        await api.verifyPass(booking.bookingCode, booking.turfId, 'checkin');
                        setCheckInSuccess(true);
                        refreshBookings();
                        if (onStatusChange) onStatusChange(booking.status, { isCheckedIn: true });
                      } catch (err: any) {
                        alert(err.message || 'Check-in failed');
                      } finally {
                        setIsCheckingIn(false);
                      }
                    }}
                    className="w-full mt-2 py-1.5 px-3 bg-[#0FA958] hover:bg-[#064E3B] text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <Scan className="w-3.5 h-3.5" />
                    <span>{isCheckingIn ? 'Verifying...' : 'Owner Check-In'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#0FA958]" />
                <span>Financial &amp; Payment Breakdown</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  booking.dueAmount === 0
                    ? 'bg-emerald-100 text-[#064E3B]'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {booking.dueAmount === 0 ? 'Fully Paid' : 'Partially Paid'}
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-2 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>Pitch Hourly Charge:</span>
                <span className="font-mono text-[#0F172A]">
                  BDT {Math.round(booking.totalAmount / Math.max(1, booking.durationHours))} / hour × {booking.durationHours}h
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Total Pitch Fee:</span>
                <span className="font-mono font-bold text-[#0F172A]">BDT {booking.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#064E3B] font-semibold border-t border-slate-200 pt-2">
                <span>Advance Paid ({booking.paymentMethod.toUpperCase()}):</span>
                <span className="font-mono font-bold">BDT {booking.advancePaid.toLocaleString()}</span>
              </div>
              {booking.transactionId && (
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>MFS Transaction Trx ID:</span>
                  <span className="font-mono text-slate-800">{booking.transactionId}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
                <span className="font-bold text-[#0F172A]">Due on Field Arrival:</span>
                <span className={`text-base font-black font-mono ${booking.dueAmount > 0 ? 'text-amber-700' : 'text-[#0FA958]'}`}>
                  BDT {booking.dueAmount.toLocaleString()}
                </span>
              </div>
              {booking.dueAmount > 0 && (
                <p className="text-[11px] text-slate-500 pt-1">
                  Pay the remaining BDT {booking.dueAmount.toLocaleString()} balance at the venue counter via cash or mobile money.
                </p>
              )}
            </div>
          </div>

          {/* Special Notes (if any) */}
          {booking.notes && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Match Requests / Notes:</span>
              <p className="text-slate-800 italic">"{booking.notes}"</p>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            {/* Customer Cancellation Request Button */}
            {!canManage && isUpcoming && booking.status !== 'cancellation_requested' && onRequestCancel && (
              <button
                onClick={() => onRequestCancel(booking)}
                className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
              >
                Request Cancellation &amp; Refund
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
                    className="px-3 py-1.5 bg-[#0FA958] hover:bg-[#0d924c] text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
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
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-2xs"
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
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Approve Cancellation &amp; Refund
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl border border-slate-200 transition-colors ml-auto cursor-pointer"
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

      {showSplitterModal && (
        <SquadCostSplitterModal
          booking={booking}
          onClose={() => setShowSplitterModal(false)}
        />
      )}
    </div>
  );
};
