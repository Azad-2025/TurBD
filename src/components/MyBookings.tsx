import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Booking } from '../types';
import { BookingDetailsModal } from './BookingDetailsModal';
import { CancellationModal } from './CancellationModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { SquadCostSplitterModal } from './SquadCostSplitterModal';
import { generateSquadShareData } from '../utils/shareUtils';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Phone,
  Ticket,
  Star,
  X,
  Compass,
  AlertTriangle,
  RefreshCw,
  QrCode,
  FileText,
  DollarSign,
  ShieldCheck,
  Receipt,
  CreditCard,
  Copy,
  Check,
  Download,
  MessageCircle,
  Users,
} from 'lucide-react';

export const MyBookings: React.FC = () => {
  const {
    bookings,
    currentUser,
    setActiveTab,
    setSelectedTurf,
    turfs,
    updateBookingStatus,
    refreshBookings,
  } = useApp();

  const [activeTabMode, setActiveTabMode] = useState<'matches' | 'payments'>('matches');
  const [activeFilter, setActiveFilter] = useState<'upcoming' | 'completed' | 'cancelled' | 'all'>('upcoming');
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);
  const [selectedBookingForReceipt, setSelectedBookingForReceipt] = useState<Booking | null>(null);
  const [selectedBookingForSplitter, setSelectedBookingForSplitter] = useState<Booking | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedTrxId, setCopiedTrxId] = useState<string | null>(null);

  // Filter for current user's bookings (or show all if guest/demo for easy preview)
  const userBookings = bookings.filter((b) => {
    if (currentUser?.role === 'admin') return true;
    if (currentUser) return b.userId === currentUser.id || b.userEmail === currentUser.email;
    return true;
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const upcomingCount = userBookings.filter(
    (b) => b.date >= todayStr && b.status !== 'cancelled' && b.status !== 'cancellation_requested'
  ).length;

  const completedCount = userBookings.filter(
    (b) => (b.date < todayStr || b.status === 'completed') && b.status !== 'cancelled'
  ).length;

  const cancelledCount = userBookings.filter(
    (b) => b.status === 'cancelled' || b.status === 'cancellation_requested'
  ).length;

  const filteredBookings = userBookings.filter((b) => {
    if (activeFilter === 'upcoming') {
      return b.date >= todayStr && b.status !== 'cancelled' && b.status !== 'cancellation_requested';
    }
    if (activeFilter === 'completed') {
      return (b.date < todayStr || b.status === 'completed') && b.status !== 'cancelled';
    }
    if (activeFilter === 'cancelled') {
      return b.status === 'cancelled' || b.status === 'cancellation_requested';
    }
    return true;
  });

  const totalPaidSum = userBookings.reduce((acc, b) => acc + (b.advancePaid || 0), 0);
  const totalDueSum = userBookings.reduce((acc, b) => acc + (b.dueAmount || 0), 0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshBookings();
    setIsRefreshing(false);
  };

  const copyTrx = (trxId: string) => {
    navigator.clipboard.writeText(trxId);
    setCopiedTrxId(trxId);
    setTimeout(() => setCopiedTrxId(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8" id="my-bookings-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <span>Customer Match &amp; Payment Hub</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Track confirmed slots, digital check-in passes, real-time gateway payments, and official receipts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Refresh bookings from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0FA958]' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* Navigation Toggle: Matches vs Payment History */}
          <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-xl">
            <button
              onClick={() => setActiveTabMode('matches')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTabMode === 'matches'
                  ? 'bg-white text-[#064E3B] shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Matches ({userBookings.length})</span>
            </button>
            <button
              onClick={() => setActiveTabMode('payments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTabMode === 'payments'
                  ? 'bg-white text-[#064E3B] shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Payment History &amp; Receipts</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: MATCH BOOKINGS */}
      {activeTabMode === 'matches' && (
        <div className="space-y-6">
          {/* Sub-Filter Pills */}
          <div className="flex bg-white border border-slate-200 p-1 rounded-xl w-fit shadow-2xs">
            <button
              onClick={() => setActiveFilter('upcoming')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeFilter === 'upcoming'
                  ? 'bg-slate-100 text-[#064E3B] shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Upcoming ({upcomingCount})
            </button>
            <button
              onClick={() => setActiveFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeFilter === 'completed'
                  ? 'bg-slate-100 text-[#064E3B] shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Completed ({completedCount})
            </button>
            <button
              onClick={() => setActiveFilter('cancelled')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeFilter === 'cancelled'
                  ? 'bg-slate-100 text-red-600 shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Cancelled ({cancelledCount})
            </button>
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-slate-100 text-[#0F172A] shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              All ({userBookings.length})
            </button>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 shadow-card">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                <Ticket className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">No bookings found in this category</h3>
                <p className="text-xs text-[#64748B] mt-1">
                  {activeFilter === 'upcoming'
                    ? "You don't have any upcoming sports matches scheduled."
                    : activeFilter === 'cancelled'
                    ? 'You have no cancelled bookings.'
                    : 'No historical matches recorded yet.'}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('browse')}
                className="px-5 py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs transition-colors inline-flex items-center gap-2 cursor-pointer shadow-soft"
              >
                <Compass className="w-4 h-4" />
                <span>Browse Available Turfs</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBookings.map((b) => {
                const turfObj = turfs.find((t) => t.id === b.turfId);
                const isCancelled = b.status === 'cancelled';
                const isCancellationRequested = b.status === 'cancellation_requested';
                const isUpcoming = b.date >= todayStr && !isCancelled && !isCancellationRequested;

                return (
                  <div
                    key={b.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between shadow-card"
                    id={`booking-card-${b.id}`}
                  >
                    <div>
                      {/* Top Bar: Code & Status */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-mono font-extrabold text-[#064E3B] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          #{b.bookingCode}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {b.isCheckedIn && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-[#064E3B] border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-[#0FA958]" />
                              <span>Checked In</span>
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md inline-flex items-center gap-1 shadow-2xs ${
                              b.status === 'confirmed'
                                ? 'bg-emerald-50 text-[#064E3B] border border-emerald-200'
                                : b.status === 'cancellation_requested'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                                : b.status === 'cancelled'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : b.status === 'completed'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {b.status === 'confirmed' && <CheckCircle2 className="w-3 h-3 text-[#0FA958]" />}
                            {b.status === 'cancellation_requested' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                            {b.status === 'cancelled' && <X className="w-3 h-3 text-rose-600" />}
                            {b.status === 'completed' && <Check className="w-3 h-3 text-blue-600" />}
                            <span>{b.status === 'cancellation_requested' ? 'Cancel Requested' : b.status.replace('_', ' ')}</span>
                          </span>
                        </div>
                      </div>

                      {/* Turf Title & Location */}
                      <h3 className="text-base font-bold text-[#0F172A] hover:text-[#0FA958] transition-colors">
                        {b.turfName}
                      </h3>
                      <p className="text-xs text-[#64748B] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#0FA958]" />
                        <span>{b.turfArea}, {b.turfCity}</span>
                      </p>

                      {/* Date & Time Badge */}
                      <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#64748B]" />
                          <span className="font-semibold text-[#0F172A]">{b.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[#064E3B] font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{b.startTime} - {b.endTime}</span>
                        </div>
                      </div>

                      {/* Cancellation / Refund Alert (if requested or cancelled) */}
                      {(isCancellationRequested || isCancelled) && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[#64748B] text-[10px] uppercase font-bold">Refund Status:</span>
                            <span
                              className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                                b.refundStatus === 'refunded'
                                  ? 'bg-emerald-50 text-[#064E3B] border border-emerald-200'
                                  : b.refundStatus === 'rejected'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {b.refundStatus === 'refunded'
                                ? 'Refunded (BDT ' + (b.refundAmount || b.advancePaid) + ')'
                                : b.refundStatus === 'rejected'
                                ? 'Refund Rejected'
                                : 'Review In Progress'}
                            </span>
                          </div>
                          {b.cancellationReason && (
                            <p className="text-[11px] text-[#64748B] truncate">
                              Reason: {b.cancellationReason}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Payment Breakdown */}
                      <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1">
                        <div className="flex justify-between text-[#64748B]">
                          <span>Total Pitch Fee ({b.durationHours} hr{b.durationHours > 1 ? 's' : ''}):</span>
                          <span className="font-mono text-[#0F172A] font-semibold">BDT {b.totalAmount}</span>
                        </div>
                        <div className="flex justify-between text-[#64748B]">
                          <span>Paid ({b.paymentMethod.toUpperCase()}):</span>
                          <span className="font-mono text-[#0FA958] font-bold">BDT {b.advancePaid}</span>
                        </div>
                        {b.dueAmount > 0 ? (
                          <div className="flex justify-between text-amber-700 font-semibold">
                            <span>Due at Reception:</span>
                            <span className="font-mono">BDT {b.dueAmount}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between text-[#064E3B] font-semibold">
                            <span>Payment Status:</span>
                            <span>Fully Paid (100%)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedBookingForDetails(b)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#0FA958]" />
                          <span>Pass</span>
                        </button>
                        <button
                          onClick={() => setSelectedBookingForReceipt(b)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-[#0F172A] bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          title="View & Download Tax Receipt"
                        >
                          <Receipt className="w-3.5 h-3.5 text-[#0FA958]" />
                          <span>Receipt</span>
                        </button>
                        <button
                          onClick={() => setSelectedBookingForSplitter(b)}
                          className="px-2.5 py-1.5 text-xs font-bold text-[#064E3B] bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          title="Squad Cost Splitter"
                        >
                          <Users className="w-3.5 h-3.5 text-[#0FA958]" />
                          <span className="hidden sm:inline">Split</span>
                        </button>
                        <a
                          href={generateSquadShareData(b).whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-[#064E3B] bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          title="Share Match Pass with Squad via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-[#0FA958]" />
                          <span className="hidden sm:inline">Squad</span>
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        {turfObj && (
                          <button
                            onClick={() => setSelectedTurf(turfObj)}
                            className="p-1.5 text-xs font-bold text-[#0FA958] hover:text-[#064E3B] hover:bg-emerald-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                            title="Review turf arena"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isUpcoming && (
                          <button
                            onClick={() => setSelectedBookingForCancel(b)}
                            className="text-xs text-[#64748B] hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: PAYMENT HISTORY & OFFICIAL RECEIPTS */}
      {activeTabMode === 'payments' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-card">
              <span className="text-[10px] uppercase font-bold text-[#64748B]">Total Payments Completed</span>
              <div className="text-xl font-black font-mono text-[#064E3B] mt-1">
                BDT {totalPaidSum.toLocaleString()}
              </div>
              <span className="text-[11px] text-[#64748B]">Across {userBookings.length} bookings</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-card">
              <span className="text-[10px] uppercase font-bold text-[#64748B]">Remaining Due at Counters</span>
              <div className="text-xl font-black font-mono text-amber-700 mt-1">
                BDT {totalDueSum.toLocaleString()}
              </div>
              <span className="text-[11px] text-[#64748B]">Payable at arena entrance</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-card">
              <span className="text-[10px] uppercase font-bold text-[#64748B]">Supported Gateways</span>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="px-2 py-0.5 rounded bg-pink-50 border border-pink-200 text-pink-700 text-[10px] font-bold">
                  bKash
                </span>
                <span className="px-2 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-bold">
                  Nagad
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold">
                  SSLCommerz
                </span>
              </div>
              <span className="text-[11px] text-[#64748B] block mt-1">256-bit SSL secured</span>
            </div>
          </div>

          {/* Payment Transactions Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#0FA958]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                  Transaction Audit &amp; Tax Receipt Ledger
                </span>
              </div>
              <span className="text-xs text-[#64748B] font-mono">{userBookings.length} records</span>
            </div>

            {userBookings.length === 0 ? (
              <div className="p-10 text-center text-[#64748B] text-xs">
                No payment transactions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {userBookings.map((b) => {
                  const methodUpper = (b.paymentMethod || 'bkash').toUpperCase();
                  const trxId = b.transactionId || `TRX_${b.bookingCode}`;

                  return (
                    <div
                      key={b.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              b.paymentMethod === 'bkash'
                                ? 'bg-pink-50 text-pink-700 border border-pink-200'
                                : b.paymentMethod === 'nagad'
                                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                : b.paymentMethod === 'sslcommerz'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-[#064E3B] border border-emerald-200'
                            }`}
                          >
                            {methodUpper}
                          </span>
                          <span className="text-xs font-bold text-[#0F172A]">{b.turfName}</span>
                          <span className="text-slate-300 text-xs">•</span>
                          <span className="text-xs text-[#64748B]">{b.date}</span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
                          <span>Booking #{b.bookingCode}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1 font-mono">
                            <span>TrxID: {trxId}</span>
                            <button
                              onClick={() => copyTrx(trxId)}
                              className="text-slate-400 hover:text-[#0F172A] transition-colors cursor-pointer"
                              title="Copy Transaction ID"
                            >
                              {copiedTrxId === trxId ? (
                                <Check className="w-3 h-3 text-[#0FA958]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-right">
                          <div className="text-sm font-black font-mono text-[#064E3B]">
                            BDT {b.advancePaid.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-[#64748B]">
                            {b.dueAmount > 0 ? (
                              <span className="text-amber-700 font-semibold">Due: BDT {b.dueAmount}</span>
                            ) : (
                              <span className="text-[#064E3B] font-semibold">Paid in Full</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={`/api/invoices/booking/${b.id}/html`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-[#0F172A] rounded-xl text-xs font-bold border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Open printable official invoice"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-600" />
                            <span className="hidden sm:inline">Tax Invoice</span>
                          </a>
                          <button
                            onClick={() => setSelectedBookingForReceipt(b)}
                            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-[#0F172A] rounded-xl text-xs font-bold border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Receipt className="w-3.5 h-3.5 text-[#0FA958]" />
                            <span>Receipt</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Booking Details Pass Modal */}
      {selectedBookingForDetails && (
        <BookingDetailsModal
          booking={selectedBookingForDetails}
          turf={turfs.find((t) => t.id === selectedBookingForDetails.turfId)}
          onClose={() => setSelectedBookingForDetails(null)}
          onRequestCancel={(booking) => {
            setSelectedBookingForDetails(null);
            setSelectedBookingForCancel(booking);
          }}
        />
      )}

      {/* Cancellation Request Modal */}
      {selectedBookingForCancel && (
        <CancellationModal
          booking={selectedBookingForCancel}
          onClose={() => setSelectedBookingForCancel(null)}
          onSuccess={() => {
            setSelectedBookingForCancel(null);
            refreshBookings();
          }}
        />
      )}

      {/* Tax Invoice & Printable Receipt Modal */}
      {selectedBookingForReceipt && (
        <PaymentReceiptModal
          booking={selectedBookingForReceipt}
          onClose={() => setSelectedBookingForReceipt(null)}
          transactionId={selectedBookingForReceipt.transactionId}
          paymentMethod={selectedBookingForReceipt.paymentMethod}
          paymentAmount={selectedBookingForReceipt.advancePaid}
        />
      )}

      {/* Squad Cost Splitter Modal */}
      {selectedBookingForSplitter && (
        <SquadCostSplitterModal
          booking={selectedBookingForSplitter}
          onClose={() => setSelectedBookingForSplitter(null)}
        />
      )}
    </div>
  );
};

