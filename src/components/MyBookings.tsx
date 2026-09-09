import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
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
} from 'lucide-react';
import { Booking } from '../types';
import { BookingDetailsModal } from './BookingDetailsModal';
import { CancellationModal } from './CancellationModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';

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
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span>Customer Match &amp; Payment Hub</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Track confirmed slots, digital check-in passes, real-time gateway payments, and official receipts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Refresh bookings from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* Navigation Toggle: Matches vs Payment History */}
          <div className="flex bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTabMode('matches')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTabMode === 'matches'
                  ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Matches ({userBookings.length})</span>
            </button>
            <button
              onClick={() => setActiveTabMode('payments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTabMode === 'payments'
                  ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
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
          <div className="flex bg-neutral-900/80 border border-neutral-800/80 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveFilter('upcoming')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeFilter === 'upcoming'
                  ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Upcoming ({upcomingCount})
            </button>
            <button
              onClick={() => setActiveFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeFilter === 'completed'
                  ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Completed ({completedCount})
            </button>
            <button
              onClick={() => setActiveFilter('cancelled')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeFilter === 'cancelled'
                  ? 'bg-neutral-800 text-red-400 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Cancelled ({cancelledCount})
            </button>
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              All ({userBookings.length})
            </button>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                <Ticket className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No bookings found in this category</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  {activeFilter === 'upcoming'
                    ? "You don't have any upcoming sports matches scheduled."
                    : activeFilter === 'cancelled'
                    ? 'You have no cancelled bookings.'
                    : 'No historical matches recorded yet.'}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('browse')}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
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
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 hover:border-neutral-700 transition-all flex flex-col justify-between shadow-sm"
                    id={`booking-card-${b.id}`}
                  >
                    <div>
                      {/* Top Bar: Code & Status */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-mono font-extrabold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60">
                          #{b.bookingCode}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              b.status === 'confirmed'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : b.status === 'cancellation_requested'
                                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 animate-pulse'
                                : b.status === 'cancelled'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                : b.status === 'completed'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {b.status === 'cancellation_requested' ? 'Cancel Requested' : b.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Turf Title & Location */}
                      <h3 className="text-base font-bold text-white hover:text-emerald-400 transition-colors">
                        {b.turfName}
                      </h3>
                      <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{b.turfArea}, {b.turfCity}</span>
                      </p>

                      {/* Date & Time Badge */}
                      <div className="mt-3 bg-neutral-850 p-3 rounded-xl border border-neutral-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-neutral-400" />
                          <span className="font-semibold text-white">{b.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{b.startTime} - {b.endTime}</span>
                        </div>
                      </div>

                      {/* Cancellation / Refund Alert (if requested or cancelled) */}
                      {(isCancellationRequested || isCancelled) && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-400 text-[10px] uppercase font-bold">Refund Status:</span>
                            <span
                              className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                                b.refundStatus === 'refunded'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : b.refundStatus === 'rejected'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {b.refundStatus === 'refunded'
                                ? 'Refunded (৳' + (b.refundAmount || b.advancePaid) + ')'
                                : b.refundStatus === 'rejected'
                                ? 'Refund Rejected'
                                : 'Review In Progress'}
                            </span>
                          </div>
                          {b.cancellationReason && (
                            <p className="text-[11px] text-neutral-400 truncate">
                              Reason: {b.cancellationReason}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Payment Breakdown */}
                      <div className="mt-3 pt-3 border-t border-neutral-800/80 text-xs space-y-1">
                        <div className="flex justify-between text-neutral-400">
                          <span>Total Pitch Fee ({b.durationHours} hr{b.durationHours > 1 ? 's' : ''}):</span>
                          <span className="font-mono text-white font-semibold">৳{b.totalAmount}</span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>Paid ({b.paymentMethod.toUpperCase()}):</span>
                          <span className="font-mono text-emerald-400 font-bold">৳{b.advancePaid}</span>
                        </div>
                        {b.dueAmount > 0 ? (
                          <div className="flex justify-between text-amber-400 font-semibold">
                            <span>Due at Reception:</span>
                            <span className="font-mono">৳{b.dueAmount}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between text-emerald-400 font-semibold">
                            <span>Payment Status:</span>
                            <span>Fully Paid (100%)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedBookingForDetails(b)}
                          className="px-3 py-1.5 text-xs font-bold text-neutral-200 bg-neutral-800 hover:bg-neutral-750 rounded-xl border border-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Pass</span>
                        </button>
                        <button
                          onClick={() => setSelectedBookingForReceipt(b)}
                          className="px-3 py-1.5 text-xs font-bold text-neutral-300 hover:text-white bg-neutral-850 hover:bg-neutral-800 rounded-xl border border-neutral-700/80 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="View & Download Tax Receipt"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Receipt</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {turfObj && (
                          <button
                            onClick={() => setSelectedTurf(turfObj)}
                            className="p-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                            title="Review turf arena"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isUpcoming && (
                          <button
                            onClick={() => setSelectedBookingForCancel(b)}
                            className="text-xs text-neutral-400 hover:text-red-400 hover:bg-red-950/20 px-2 py-1 rounded-lg transition-colors cursor-pointer"
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
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-neutral-400">Total Payments Completed</span>
              <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                ৳{totalPaidSum.toLocaleString()} BDT
              </div>
              <span className="text-[11px] text-neutral-500">Across {userBookings.length} bookings</span>
            </div>

            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-neutral-400">Remaining Due at Counters</span>
              <div className="text-xl font-black font-mono text-amber-400 mt-1">
                ৳{totalDueSum.toLocaleString()} BDT
              </div>
              <span className="text-[11px] text-neutral-500">Payable at arena entrance</span>
            </div>

            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-neutral-400">Supported Gateways</span>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="px-2 py-0.5 rounded bg-pink-950/60 border border-pink-500/30 text-pink-400 text-[10px] font-bold">
                  bKash
                </span>
                <span className="px-2 py-0.5 rounded bg-orange-950/60 border border-orange-500/30 text-orange-400 text-[10px] font-bold">
                  Nagad
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-400 text-[10px] font-bold">
                  SSLCommerz
                </span>
              </div>
              <span className="text-[11px] text-neutral-500 block mt-1">256-bit SSL secured</span>
            </div>
          </div>

          {/* Payment Transactions Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  Transaction Audit &amp; Tax Receipt Ledger
                </span>
              </div>
              <span className="text-xs text-neutral-400 font-mono">{userBookings.length} records</span>
            </div>

            {userBookings.length === 0 ? (
              <div className="p-10 text-center text-neutral-400 text-xs">
                No payment transactions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-neutral-800/80">
                {userBookings.map((b) => {
                  const methodUpper = (b.paymentMethod || 'bkash').toUpperCase();
                  const trxId = b.transactionId || `TRX_${b.bookingCode}`;

                  return (
                    <div
                      key={b.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-850/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              b.paymentMethod === 'bkash'
                                ? 'bg-pink-950/60 text-pink-400 border border-pink-800/60'
                                : b.paymentMethod === 'nagad'
                                ? 'bg-orange-950/60 text-orange-400 border border-orange-800/60'
                                : b.paymentMethod === 'sslcommerz'
                                ? 'bg-blue-950/60 text-blue-400 border border-blue-800/60'
                                : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                            }`}
                          >
                            {methodUpper}
                          </span>
                          <span className="text-xs font-bold text-white">{b.turfName}</span>
                          <span className="text-neutral-500 text-xs">•</span>
                          <span className="text-xs text-neutral-400">{b.date}</span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                          <span>Booking #{b.bookingCode}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1 font-mono">
                            <span>TrxID: {trxId}</span>
                            <button
                              onClick={() => copyTrx(trxId)}
                              className="text-neutral-500 hover:text-white transition-colors"
                              title="Copy Transaction ID"
                            >
                              {copiedTrxId === trxId ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-right">
                          <div className="text-sm font-black font-mono text-emerald-400">
                            ৳{b.advancePaid.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            {b.dueAmount > 0 ? (
                              <span className="text-amber-400 font-semibold">Due: ৳{b.dueAmount}</span>
                            ) : (
                              <span className="text-emerald-400 font-semibold">Paid in Full</span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedBookingForReceipt(b)}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 hover:text-white rounded-xl text-xs font-bold border border-neutral-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                          <span>View Receipt</span>
                        </button>
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
    </div>
  );
};

