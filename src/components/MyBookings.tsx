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
} from 'lucide-react';
import { Booking } from '../types';

export const MyBookings: React.FC = () => {
  const {
    bookings,
    currentUser,
    setActiveTab,
    setSelectedTurf,
    turfs,
    updateBookingStatus,
    setIsAuthModalOpen,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');
  const [viewVoucher, setViewVoucher] = useState<Booking | null>(null);

  // Filter for current user's bookings (or show all if guest/demo for easy preview)
  const userBookings = bookings.filter((b) => {
    if (currentUser?.role === 'admin') return true;
    if (currentUser) return b.userId === currentUser.id || b.userEmail === currentUser.email;
    return true;
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredBookings = userBookings.filter((b) => {
    if (activeFilter === 'upcoming') {
      return b.date >= todayStr && b.status !== 'cancelled';
    }
    if (activeFilter === 'completed') {
      return b.date < todayStr || b.status === 'completed';
    }
    return true;
  });

  const handleCancelBooking = (id: string) => {
    if (confirm('Are you sure you want to cancel this booking?')) {
      updateBookingStatus(id, 'cancelled');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8" id="my-bookings-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            My Match Passes & Bookings
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Track booked turf slots, digital vouchers, and payment balances.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveFilter('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeFilter === 'upcoming' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Upcoming ({userBookings.filter((b) => b.date >= todayStr && b.status !== 'cancelled').length})
          </button>
          <button
            onClick={() => setActiveFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeFilter === 'completed' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeFilter === 'all' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            All Passes ({userBookings.length})
          </button>
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
            <Ticket className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No bookings found</h3>
            <p className="text-xs text-neutral-400 mt-1">
              You haven't reserved any sports turfs in this category yet.
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

            return (
              <div
                key={b.id}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 hover:border-neutral-700 transition-all flex flex-col justify-between"
                id={`booking-card-${b.id}`}
              >
                <div>
                  {/* Top Bar: Code & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-extrabold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60">
                      #{b.bookingCode}
                    </span>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        b.status === 'confirmed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : b.status === 'pending_approval'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-neutral-800 text-neutral-500'
                      }`}
                    >
                      {b.status.replace('_', ' ')}
                    </span>
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
                  <div className="mt-3.5 bg-neutral-850 p-3 rounded-xl border border-neutral-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-neutral-400" />
                      <span className="font-semibold text-white">{b.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{b.startTime} - {b.endTime}</span>
                    </div>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="mt-3 pt-3 border-t border-neutral-800/80 text-xs space-y-1">
                    <div className="flex justify-between text-neutral-400">
                      <span>Total Pitch Fee:</span>
                      <span className="font-mono text-white font-semibold">৳{b.totalAmount}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Advance Paid ({b.paymentMethod.toUpperCase()}):</span>
                      <span className="font-mono text-emerald-400 font-bold">৳{b.advancePaid}</span>
                    </div>
                    {b.dueAmount > 0 ? (
                      <div className="flex justify-between text-amber-400 font-semibold">
                        <span>Due at Field Reception:</span>
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
                  <button
                    onClick={() => setViewVoucher(b)}
                    className="px-3 py-1.5 text-xs font-bold text-neutral-200 bg-neutral-800 hover:bg-neutral-750 rounded-xl border border-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                    <span>View Pass</span>
                  </button>

                  {turfObj && (
                    <button
                      onClick={() => setSelectedTurf(turfObj)}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>Review Arena</span>
                    </button>
                  )}

                  {b.status === 'confirmed' && (
                    <button
                      onClick={() => handleCancelBooking(b.id)}
                      className="text-[11px] text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Digital Match Pass Modal */}
      {viewVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <button
              onClick={() => setViewVoucher(null)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pt-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">TurfBD Match Pass</span>
              <h3 className="text-xl font-black text-white mt-0.5">{viewVoucher.turfName}</h3>
              <p className="text-xs text-neutral-400">{viewVoucher.turfArea}, {viewVoucher.turfCity}</p>
            </div>

            <div className="bg-neutral-850 p-5 rounded-2xl border-2 border-dashed border-neutral-700 space-y-4 text-xs font-mono">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <span className="text-neutral-400">Pass Code:</span>
                <span className="text-lg font-bold text-emerald-400">#{viewVoucher.bookingCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Player:</span>
                <span className="text-white font-bold">{viewVoucher.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Date:</span>
                <span className="text-white font-bold">{viewVoucher.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Time:</span>
                <span className="text-emerald-400 font-bold">{viewVoucher.startTime} - {viewVoucher.endTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Sport:</span>
                <span className="capitalize text-white font-bold">{viewVoucher.sport}</span>
              </div>
              <div className="flex justify-between border-t border-neutral-800 pt-3">
                <span className="text-neutral-400">Paid ({viewVoucher.paymentMethod}):</span>
                <span className="text-emerald-400 font-bold">৳{viewVoucher.advancePaid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Due at Field:</span>
                <span className="text-amber-400 font-bold">৳{viewVoucher.dueAmount}</span>
              </div>
              {viewVoucher.transactionId && (
                <div className="flex justify-between text-[11px] text-neutral-500">
                  <span>Trx ID:</span>
                  <span>{viewVoucher.transactionId}</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-neutral-400 text-center">
              Please present this voucher screen at the turf reception desk before kickoff.
            </p>

            <button
              onClick={() => setViewVoucher(null)}
              className="w-full py-2.5 bg-emerald-500 text-neutral-950 font-bold rounded-xl text-xs"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
