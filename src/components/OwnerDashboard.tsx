import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  Calendar,
  DollarSign,
  Clock,
  PlusCircle,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Sliders,
  AlertCircle,
  Tag,
  Edit2,
  X,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Turf, SportType, Booking } from '../types';
import { BANGLADESH_CITIES, DHAKA_AREAS, AMENITY_LIST } from '../data/mockData';
import { BookingDetailsModal } from './BookingDetailsModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import {
  Receipt,
  CreditCard,
  Wallet,
  Landmark,
  Check,
  Copy,
  ArrowUpRight,
  Send,
} from 'lucide-react';

export const OwnerDashboard: React.FC = () => {
  const {
    currentUser,
    turfs,
    bookings,
    addTurf,
    updateTurf,
    updateBookingStatus,
    blockedSlots,
    toggleSlotBlock,
    switchRole,
    refreshBookings,
  } = useApp();

  // If current user is not owner, prompt or allow 1-click switch
  const isOwner = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  // Filter turfs owned by this owner (or show owner's turfs from mock if testing)
  const ownerTurfs = turfs.filter(
    (t) => t.ownerId === currentUser?.id || currentUser?.role === 'admin' || t.ownerId === 'user-owner-1'
  );

  const [activeTab, setActiveTab] = useState<'overview' | 'turfs' | 'bookings' | 'slots' | 'payments'>('overview');
  const [selectedTurfForSlots, setSelectedTurfForSlots] = useState<string>(ownerTurfs[0]?.id || '');
  const [selectedPaymentBookingForReceipt, setSelectedPaymentBookingForReceipt] = useState<Booking | null>(null);
  const [settlementAmount, setSettlementAmount] = useState<number>(5000);
  const [settlementMethod, setSettlementMethod] = useState<'bkash' | 'nagad' | 'bank'>('bkash');
  const [settlementAccount, setSettlementAccount] = useState<string>('01711223344');
  const [settlementBankName, setSettlementBankName] = useState<string>('BRAC Bank Ltd');
  const [settlementSubmitting, setSettlementSubmitting] = useState<boolean>(false);
  const [settlementSuccessMessage, setSettlementSuccessMessage] = useState<string | null>(null);
  const [settlementsList, setSettlementsList] = useState([
    {
      id: 'SET-9812',
      amount: 15000,
      method: 'bKash Merchant',
      account: '01711223344',
      date: '2026-03-28',
      status: 'Dispatched & Settled',
    },
    {
      id: 'SET-9405',
      amount: 22500,
      method: 'BRAC Bank',
      account: '1501203498877001',
      date: '2026-03-21',
      status: 'Dispatched & Settled',
    },
  ]);
  const [slotDate, setSlotDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Booking management specific states
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'all' | 'upcoming' | 'pending' | 'cancellation_requested' | 'completed' | 'cancelled'>('upcoming');
  const [bookingCalendarDate, setBookingCalendarDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0);
  const [ownerBookingTurfFilter, setOwnerBookingTurfFilter] = useState<string>('all');
  const [bookingViewMode, setBookingViewMode] = useState<'schedule' | 'list'>('schedule');

  // Modal for adding a new turf
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTurfName, setNewTurfName] = useState('');
  const [newTurfCity, setNewTurfCity] = useState('Dhaka');
  const [newTurfArea, setNewTurfArea] = useState('Dhanmondi');
  const [newTurfAddress, setNewTurfAddress] = useState('');
  const [newTurfHourlyRate, setNewTurfHourlyRate] = useState(1800);
  const [newTurfPeakRate, setNewTurfPeakRate] = useState(2100);
  const [newTurfSize, setNewTurfSize] = useState('7 vs 7 & Box Cricket');
  const [newTurfSurface, setNewTurfSurface] = useState('50mm FIFA Quality Pro Turf');
  const [newTurfDescription, setNewTurfDescription] = useState('');
  const [newTurfSports, setNewTurfSports] = useState<SportType[]>(['football', 'cricket']);
  const [newTurfAmenities, setNewTurfAmenities] = useState<string[]>([
    'Floodlights',
    'Locker Room',
    'Shower',
    'Bibs & Match Balls',
    'Reserved Parking',
  ]);
  const [newTurfImageUrl, setNewTurfImageUrl] = useState(
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80'
  );

  // Financial calculations for this owner's venues
  const ownerTurfIds = ownerTurfs.map((t) => t.id);
  const ownerBookings = bookings.filter((b) => ownerTurfIds.includes(b.turfId));

  const totalRevenue = ownerBookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((acc, b) => acc + b.totalAmount, 0);

  const totalAdvanceCollected = ownerBookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((acc, b) => acc + b.advancePaid, 0);

  const pendingDueAmount = ownerBookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((acc, b) => acc + b.dueAmount, 0);

  const pendingApprovalsCount = ownerBookings.filter((b) => b.status === 'pending_approval').length;
  const pendingTurfsCount = ownerTurfs.filter((t) => t.status === 'pending').length;

  const handleCreateTurf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTurfName.trim() || !newTurfAddress.trim()) return;

    addTurf({
      name: newTurfName.trim(),
      tagline: `Premier ${newTurfSize} arena in ${newTurfArea}, ${newTurfCity}`,
      description: newTurfDescription.trim() || `Modern turf facility in ${newTurfArea} equipped with high grade artificial grass, bright floodlights, and clean changing rooms.`,
      city: newTurfCity,
      area: newTurfArea,
      address: newTurfAddress.trim(),
      sports: newTurfSports,
      size: newTurfSize,
      surface: newTurfSurface,
      hourlyRate: Number(newTurfHourlyRate),
      peakHourRate: Number(newTurfPeakRate),
      images: [newTurfImageUrl],
      amenities: newTurfAmenities,
      ownerId: currentUser?.id || 'user-owner-1',
      ownerName: currentUser?.name || 'Turf Owner',
      ownerPhone: currentUser?.phone || '+880 1819-876543',
      openingTime: '06:00',
      closingTime: '02:00',
    });

    setIsAddModalOpen(false);
    setActiveTab('turfs');
    // Reset
    setNewTurfName('');
    setNewTurfAddress('');
    setNewTurfDescription('');
  };

  const toggleSport = (s: SportType) => {
    if (newTurfSports.includes(s)) {
      if (newTurfSports.length > 1) {
        setNewTurfSports(newTurfSports.filter((item) => item !== s));
      }
    } else {
      setNewTurfSports([...newTurfSports, s]);
    }
  };

  const toggleAmenity = (a: string) => {
    if (newTurfAmenities.includes(a)) {
      setNewTurfAmenities(newTurfAmenities.filter((item) => item !== a));
    } else {
      setNewTurfAmenities([...newTurfAmenities, a]);
    }
  };

  const standardTimeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00'
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8" id="owner-dashboard-page">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40">
              Turf Management Portal
            </span>
            <span className="text-xs text-neutral-400">
              Logged in as <strong className="text-white">{currentUser?.name}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Owner Dashboard
          </h1>
          <p className="text-xs text-neutral-400">
            Manage your arena listings, track daily bookings, verify payments, and control slot availability.
          </p>
        </div>

        {/* Quick action: Add new turf */}
        <div className="flex items-center gap-2">
          {!isOwner && (
            <button
              onClick={() => switchRole('owner')}
              className="px-3 py-2 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-xl border border-amber-500/40"
            >
              Switch to Owner Persona
            </button>
          )}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
            id="owner-add-turf-btn"
          >
            <PlusCircle className="w-4 h-4" />
            <span>List New Turf</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-neutral-900 border border-neutral-800 p-1 rounded-2xl mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'overview' ? 'bg-neutral-800 text-emerald-400 shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Financial Overview
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'bookings' ? 'bg-neutral-800 text-emerald-400 shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>Slot Bookings ({ownerBookings.length})</span>
          {pendingApprovalsCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-neutral-950 font-black text-[10px] flex items-center justify-center">
              {pendingApprovalsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('turfs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'turfs' ? 'bg-neutral-800 text-emerald-400 shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>My Listed Turfs ({ownerTurfs.length})</span>
          {pendingTurfsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
              {pendingTurfsCount} pending review
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('slots')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'slots' ? 'bg-neutral-800 text-emerald-400 shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Slot Availability Schedule
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'payments' ? 'bg-neutral-800 text-emerald-400 shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Payments &amp; Settlement</span>
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Total Pitch Revenue
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ৳{totalRevenue.toLocaleString()}
              </div>
              <div className="text-[10px] text-neutral-500 mt-1">From all confirmed match bookings</div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                bKash/Nagad Advance Received
              </div>
              <div className="text-2xl font-black text-white font-mono">
                ৳{totalAdvanceCollected.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-400 mt-1">✓ Instantly verified tokens</div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Due on Field Arrival
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono">
                ৳{pendingDueAmount.toLocaleString()}
              </div>
              <div className="text-[10px] text-neutral-500 mt-1">Cash / MFS balance on arrival</div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Active Venues
              </div>
              <div className="text-2xl font-black text-white">
                {ownerTurfs.length} Arenas
              </div>
              <div className="text-[10px] text-neutral-500 mt-1">
                <span className="text-emerald-400 font-semibold">{ownerTurfs.filter((t) => t.status === 'approved').length} Live</span>
                {pendingTurfsCount > 0 && (
                  <span className="text-amber-400 font-semibold ml-1.5">• {pendingTurfsCount} Pending</span>
                )}
              </div>
            </div>
          </div>

          {/* Pending Venue Verification Alert */}
          {pendingTurfsCount > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {pendingTurfsCount} Venue{pendingTurfsCount > 1 ? 's' : ''} Awaiting Admin Verification
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Newly submitted turfs are held in the admin approval queue and remain hidden from public browse until verified.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('turfs')}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-amber-400 font-bold text-xs rounded-xl border border-neutral-700 transition-colors shrink-0"
              >
                View Status
              </button>
            </div>
          )}

          {/* Pending Action Alerts */}
          {pendingApprovalsCount > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {pendingApprovalsCount} Booking{pendingApprovalsCount > 1 ? 's' : ''} Awaiting Owner Approval
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Players have sent advance tokens and are waiting for match slot confirmation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('bookings')}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl"
              >
                Review Bookings
              </button>
            </div>
          )}

          {/* Recent Bookings Quick Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4">Latest Match Reservations</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400">
                    <th className="pb-3 font-semibold">Booking ID</th>
                    <th className="pb-3 font-semibold">Arena</th>
                    <th className="pb-3 font-semibold">Player</th>
                    <th className="pb-3 font-semibold">Date & Time</th>
                    <th className="pb-3 font-semibold">Advance Paid</th>
                    <th className="pb-3 font-semibold">Due on Field</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {ownerBookings.slice(0, 5).map((b) => (
                    <tr key={b.id} className="hover:bg-neutral-850/50">
                      <td className="py-3 font-mono font-bold text-emerald-400">#{b.bookingCode}</td>
                      <td className="py-3 font-semibold text-white">{b.turfName}</td>
                      <td className="py-3 text-neutral-300">
                        <div>{b.userName}</div>
                        <div className="text-[10px] text-neutral-500">{b.userPhone}</div>
                      </td>
                      <td className="py-3 text-neutral-300">
                        <div>{b.date}</div>
                        <div className="text-[10px] font-mono text-emerald-400">{b.startTime} - {b.endTime}</div>
                      </td>
                      <td className="py-3 font-mono font-bold text-emerald-400">৳{b.advancePaid}</td>
                      <td className="py-3 font-mono font-bold text-amber-400">৳{b.dueAmount}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          b.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                          b.status === 'pending_approval' ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          {b.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BOOKINGS MANAGEMENT TAB */}
      {activeTab === 'bookings' && (
        <div className="space-y-6" id="owner-bookings-section">
          {/* Header Bar with Turf Selector & View Switcher */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-emerald-400" />
                <span>Arena Bookings & Daily Match Schedule</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Manage live slot reservations, daily pitch schedule, player check-ins, and cancellation requests.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Turf Filter */}
              <select
                value={ownerBookingTurfFilter}
                onChange={(e) => setOwnerBookingTurfFilter(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-medium cursor-pointer"
              >
                <option value="all">All Arenas ({ownerTurfs.length})</option>
                {ownerTurfs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {/* View Switcher: Daily Schedule vs Matches List */}
              <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
                <button
                  onClick={() => setBookingViewMode('schedule')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    bookingViewMode === 'schedule'
                      ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Daily Schedule
                </button>
                <button
                  onClick={() => setBookingViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    bookingViewMode === 'list'
                      ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Matches List ({ownerBookings.length})
                </button>
              </div>

              <button
                onClick={() => refreshBookings()}
                className="p-2 text-neutral-400 hover:text-white bg-neutral-800 border border-neutral-700 rounded-xl hover:bg-neutral-700 transition-colors"
                title="Refresh Bookings"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* DAILY SCHEDULE & CALENDAR VIEW */}
          {bookingViewMode === 'schedule' && (
            <div className="space-y-4">
              {/* Modern Interactive Calendar Strip */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-neutral-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>Select Schedule Date:</span>
                    <span className="text-white font-mono bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                      {bookingCalendarDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-neutral-400 hidden sm:inline">Jump to:</label>
                    <input
                      type="date"
                      value={bookingCalendarDate}
                      onChange={(e) => setBookingCalendarDate(e.target.value)}
                      className="bg-neutral-800 border border-neutral-700 rounded-xl px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                </div>

                {/* 14-day horizontal scrollable date selector */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {Array.from({ length: 14 }).map((_, idx) => {
                    const d = new Date();
                    d.setDate(d.getDate() + idx);
                    const dateIso = d.toISOString().split('T')[0];
                    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                    const dayNum = d.getDate();
                    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
                    const isSelected = bookingCalendarDate === dateIso;
                    const matchesOnThisDay = ownerBookings.filter(
                      (b) => b.date === dateIso && (ownerBookingTurfFilter === 'all' || b.turfId === ownerBookingTurfFilter) && b.status !== 'cancelled'
                    ).length;

                    return (
                      <button
                        key={dateIso}
                        onClick={() => setBookingCalendarDate(dateIso)}
                        className={`shrink-0 flex flex-col items-center justify-center min-w-[70px] py-2.5 px-2 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-400 text-neutral-950 font-bold shadow-lg shadow-emerald-500/20 scale-105'
                            : 'bg-neutral-850 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold tracking-wider">{dayName}</span>
                        <span className="text-lg font-black">{dayNum}</span>
                        <span className="text-[10px] opacity-80">{monthName}</span>
                        {matchesOnThisDay > 0 && (
                          <span
                            className={`mt-1 text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                              isSelected ? 'bg-neutral-950 text-emerald-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {matchesOnThisDay} {matchesOnThisDay === 1 ? 'match' : 'matches'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Daily Timeline Slots */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Daily Schedule for {bookingCalendarDate}</span>
                      {ownerBookingTurfFilter !== 'all' && (
                        <span className="text-xs text-neutral-400 font-normal">
                          ({ownerTurfs.find((t) => t.id === ownerBookingTurfFilter)?.name})
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Review confirmed bookings, walk-in locks, or click any slot to lock for maintenance.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Confirmed
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Blocked / Maintenance
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-neutral-600"></span> Available
                    </span>
                  </div>
                </div>

                {/* Slots Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {standardTimeSlots.map((time) => {
                    const targetTurfId = ownerBookingTurfFilter === 'all' ? ownerTurfs[0]?.id : ownerBookingTurfFilter;
                    const blockKey = `${targetTurfId}_${bookingCalendarDate}_${time}`;
                    const isBlocked = !!blockedSlots[blockKey];

                    // Find active booking for this slot
                    const matchedBooking = ownerBookings.find(
                      (b) =>
                        (ownerBookingTurfFilter === 'all' || b.turfId === ownerBookingTurfFilter) &&
                        b.date === bookingCalendarDate &&
                        b.startTime === time &&
                        b.status !== 'cancelled'
                    );

                    return (
                      <div
                        key={time}
                        className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                          matchedBooking
                            ? 'bg-neutral-850/90 border-emerald-500/40 shadow-sm'
                            : isBlocked
                            ? 'bg-red-950/20 border-red-500/40 text-red-300'
                            : 'bg-neutral-850/40 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-mono text-sm font-black text-white flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-emerald-400" />
                              <span>{time}</span>
                            </span>

                            {matchedBooking ? (
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                  matchedBooking.status === 'confirmed'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                    : matchedBooking.status === 'cancellation_requested'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}
                              >
                                {matchedBooking.status === 'cancellation_requested'
                                  ? 'Cancel Request'
                                  : matchedBooking.status}
                              </span>
                            ) : isBlocked ? (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/40">
                                Blocked / Lock
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400">
                                Available
                              </span>
                            )}
                          </div>

                          {/* Match / Slot Details */}
                          {matchedBooking ? (
                            <div className="space-y-1.5 text-xs">
                              <div className="font-bold text-white flex items-center justify-between">
                                <span>{matchedBooking.userName}</span>
                                <span className="font-mono text-emerald-400 text-xs font-bold">
                                  #{matchedBooking.bookingCode}
                                </span>
                              </div>
                              <div className="text-neutral-400 flex items-center justify-between text-[11px]">
                                <span>Phone: {matchedBooking.userPhone}</span>
                                <span>৳{matchedBooking.totalAmount}</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-800">
                                <span className="text-emerald-400">Paid: ৳{matchedBooking.advancePaid}</span>
                                {matchedBooking.dueAmount > 0 ? (
                                  <span className="text-amber-400 font-semibold">Due: ৳{matchedBooking.dueAmount}</span>
                                ) : (
                                  <span className="text-neutral-500">Paid in full</span>
                                )}
                              </div>
                            </div>
                          ) : isBlocked ? (
                            <div className="text-xs text-red-300/80 py-2">
                              Locked for offline walk-in players or pitch maintenance.
                            </div>
                          ) : (
                            <div className="text-xs text-neutral-500 py-2">
                              Slot is open for online player bookings.
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                          {matchedBooking ? (
                            <>
                              <button
                                onClick={() => setSelectedBookingForDetails(matchedBooking)}
                                className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                <span>View Pass</span>
                              </button>

                              <a
                                href={`tel:${matchedBooking.userPhone}`}
                                className="p-1.5 text-emerald-400 hover:bg-neutral-800 rounded-lg transition-colors"
                                title="Call player"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            </>
                          ) : (
                            <button
                              onClick={() => toggleSlotBlock(targetTurfId, bookingCalendarDate, time)}
                              className={`w-full py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                                isBlocked
                                  ? 'bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700'
                                  : 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30'
                              }`}
                            >
                              {isBlocked ? 'Unlock Slot' : 'Block / Maintenance'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* UPCOMING MATCHES & STATUS MANAGEMENT LIST */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-white">Upcoming Matches & Status Management</h4>
                <p className="text-xs text-neutral-400">
                  Approve new matches, process cancellation requests, or verify player check-in vouchers.
                </p>
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
                {(
                  [
                    { id: 'upcoming', label: 'Upcoming' },
                    { id: 'pending', label: 'Pending Approval' },
                    { id: 'cancellation_requested', label: 'Cancel Requests' },
                    { id: 'completed', label: 'Completed' },
                    { id: 'cancelled', label: 'Cancelled' },
                    { id: 'all', label: 'All' },
                  ] as const
                ).map((f) => {
                  const count = ownerBookings.filter((b) => {
                    if (f.id === 'upcoming') {
                      return b.date >= new Date().toISOString().split('T')[0] && b.status !== 'cancelled';
                    }
                    if (f.id === 'pending') return b.status === 'pending_approval';
                    if (f.id === 'cancellation_requested') return b.status === 'cancellation_requested';
                    if (f.id === 'completed') return b.status === 'completed';
                    if (f.id === 'cancelled') return b.status === 'cancelled';
                    return true;
                  }).length;

                  return (
                    <button
                      key={f.id}
                      onClick={() => setBookingStatusFilter(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        bookingStatusFilter === f.id
                          ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {f.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Match Cards List */}
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0];
              const filteredList = ownerBookings.filter((b) => {
                if (ownerBookingTurfFilter !== 'all' && b.turfId !== ownerBookingTurfFilter) {
                  return false;
                }
                if (bookingStatusFilter === 'upcoming') {
                  return b.date >= todayStr && b.status !== 'cancelled';
                }
                if (bookingStatusFilter === 'pending') return b.status === 'pending_approval';
                if (bookingStatusFilter === 'cancellation_requested') return b.status === 'cancellation_requested';
                if (bookingStatusFilter === 'completed') return b.status === 'completed';
                if (bookingStatusFilter === 'cancelled') return b.status === 'cancelled';
                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center text-neutral-400 text-xs">
                    No bookings found matching current filter criteria.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 gap-3">
                  {filteredList.map((b) => (
                    <div
                      key={b.id}
                      className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-neutral-700 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                            #{b.bookingCode}
                          </span>
                          <span className="text-xs font-bold text-white">{b.turfName}</span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              b.status === 'confirmed'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : b.status === 'pending_approval'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : b.status === 'cancellation_requested'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                                : b.status === 'completed'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                                : 'bg-neutral-800 text-neutral-500'
                            }`}
                          >
                            {b.status === 'cancellation_requested' ? 'Cancel Requested' : b.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                          <span className="flex items-center gap-1 text-white font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-neutral-500" /> {b.date}
                          </span>
                          <span className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
                            <Clock className="w-3.5 h-3.5" /> {b.startTime} - {b.endTime} ({b.durationHours}h)
                          </span>
                          <span>•</span>
                          <span className="text-white">
                            Player: <strong>{b.userName}</strong> ({b.userPhone})
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs pt-1 flex-wrap">
                          <span className="text-neutral-400">
                            Total Fee: <strong className="font-mono text-white">৳{b.totalAmount}</strong>
                          </span>
                          <span className="text-emerald-400">
                            Paid: <strong className="font-mono">৳{b.advancePaid}</strong> via {b.paymentMethod.toUpperCase()}
                            {b.transactionId && ` (Trx: ${b.transactionId})`}
                          </span>
                          {b.dueAmount > 0 ? (
                            <span className="text-amber-400 font-semibold">
                              Due at Pitch: <strong className="font-mono">৳{b.dueAmount}</strong>
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold">100% Paid</span>
                          )}
                        </div>

                        {/* Cancellation request context */}
                        {b.status === 'cancellation_requested' && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                            <span className="font-bold block">User requested cancellation:</span>
                            <span className="text-[11px] block mt-0.5 italic">
                              "{b.cancellationReason || 'Match rescheduled by captain'}"
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Owner Actions */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-800 flex-wrap">
                        <button
                          onClick={() => setSelectedBookingForDetails(b)}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 font-semibold text-xs rounded-xl border border-neutral-700 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          <span>View Voucher</span>
                        </button>

                        {b.status === 'pending_approval' && (
                          <button
                            onClick={() => updateBookingStatus(b.id, 'confirmed')}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}

                        {b.status === 'cancellation_requested' && (
                          <>
                            <button
                              onClick={() => {
                                if (confirm(`Approve cancellation and refund ৳${b.advancePaid} to ${b.userName}?`)) {
                                  updateBookingStatus(b.id, 'cancelled', {
                                    refundStatus: 'refunded',
                                    refundAmount: b.advancePaid,
                                    notes: 'Cancellation and refund approved by arena manager',
                                  });
                                }
                              }}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                            >
                              Approve Refund
                            </button>
                            <button
                              onClick={() => {
                                updateBookingStatus(b.id, 'confirmed', {
                                  refundStatus: 'rejected',
                                  notes: 'Cancellation request rejected by arena manager (slot kept confirmed)',
                                });
                              }}
                              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs rounded-xl border border-neutral-700 transition-colors cursor-pointer"
                            >
                              Reject Cancel
                            </button>
                          </>
                        )}

                        {b.status === 'confirmed' && (
                          <button
                            onClick={() => updateBookingStatus(b.id, 'completed')}
                            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 font-semibold text-xs rounded-xl border border-neutral-700 transition-colors cursor-pointer"
                          >
                            Mark Completed
                          </button>
                        )}

                        {b.status !== 'cancelled' && b.status !== 'cancellation_requested' && (
                          <button
                            onClick={() => {
                              const reason = prompt('State reason for match cancellation:');
                              if (reason) {
                                updateBookingStatus(b.id, 'cancelled', {
                                  cancellationReason: reason,
                                  refundStatus: 'refunded',
                                  refundAmount: b.advancePaid,
                                });
                              }
                            }}
                            className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-xl transition-colors"
                            title="Cancel Booking"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        <a
                          href={`tel:${b.userPhone}`}
                          className="p-2 text-emerald-400 hover:bg-neutral-800 rounded-xl transition-colors border border-neutral-800"
                          title="Call Player"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MY TURFS TAB */}
      {activeTab === 'turfs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Your Listed Venues</h3>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-500 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Add Turf
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ownerTurfs.map((turf) => (
              <div
                key={turf.id}
                className={`bg-neutral-900 border rounded-2xl overflow-hidden p-5 flex flex-col justify-between transition-all ${
                  turf.status === 'pending'
                    ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/15 via-neutral-900 to-neutral-900'
                    : turf.status === 'rejected'
                    ? 'border-red-500/40 bg-gradient-to-b from-red-950/15 via-neutral-900 to-neutral-900'
                    : 'border-neutral-800'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-base font-bold text-white">{turf.name}</h4>
                      <p className="text-xs text-neutral-400">{turf.area}, {turf.city}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      turf.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : turf.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {turf.status === 'approved' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      {turf.status === 'pending' && <Clock className="w-3 h-3 text-amber-400 animate-pulse" />}
                      {turf.status === 'rejected' && <XCircle className="w-3 h-3 text-red-400" />}
                      <span>{turf.status === 'pending' ? 'Pending Admin Approval' : turf.status}</span>
                    </span>
                  </div>

                  {/* Verification Status Context Banner */}
                  {turf.status === 'pending' && (
                    <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-300 block">Awaiting Platform Verification</span>
                        <span className="text-[11px] text-amber-200/80 leading-relaxed block mt-0.5">
                          This venue is pending review by the TurfBD Admin team. It will not appear in public searches or accept player bookings until verified and approved.
                        </span>
                      </div>
                    </div>
                  )}

                  {turf.status === 'rejected' && (
                    <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-xs text-red-200">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-red-300 block">Listing Rejected</span>
                        <span className="text-[11px] text-red-200/80 leading-relaxed block mt-0.5">
                          This listing did not pass platform verification. Please contact support or update the details.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-850 p-3 rounded-xl border border-neutral-800 mb-3">
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Hourly Rate:</span>
                      <span className="font-mono font-bold text-emerald-400">৳{turf.hourlyRate}/hr</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Peak Rate:</span>
                      <span className="font-mono font-bold text-amber-400">৳{turf.peakHourRate || turf.hourlyRate}/hr</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Dimensions:</span>
                      <span className="text-white font-semibold">{turf.size}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Grass Surface:</span>
                      <span className="text-white font-semibold">{turf.surface.split(' ')[0]}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 text-[10px] text-neutral-400 mb-3">
                    {turf.amenities.map((a, i) => (
                      <span key={i} className="bg-neutral-800 px-2 py-0.5 rounded">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-neutral-400">
                    Rating: <strong className="text-white">★ {turf.rating}</strong> ({turf.reviewCount} reviews)
                  </span>

                  <button
                    onClick={() => {
                      const newRate = prompt('Enter new hourly rate in BDT:', turf.hourlyRate.toString());
                      if (newRate && !isNaN(Number(newRate))) {
                        updateTurf(turf.id, { hourlyRate: Number(newRate) });
                      }
                    }}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 rounded-lg border border-neutral-700 flex items-center gap-1 font-semibold"
                  >
                    <Edit2 className="w-3 h-3 text-emerald-400" />
                    <span>Edit Rate</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SLOT AVAILABILITY SCHEDULE TAB */}
      {activeTab === 'slots' && (
        <div className="space-y-5 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6">
          <div>
            <h3 className="text-base font-bold text-white">Daily Slot Schedule & Maintenance Lock</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Click any slot to block it for ground maintenance or walk-in offline bookings so players cannot book it online.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Select Arena</label>
              <select
                value={selectedTurfForSlots}
                onChange={(e) => setSelectedTurfForSlots(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-xs text-white"
              >
                {ownerTurfs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.area})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Select Schedule Date</label>
              <input
                type="date"
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-xs text-white"
              >
              </input>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-neutral-300 mb-3 flex items-center gap-4">
              <span>Slots for {slotDate}:</span>
              <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available
              </span>
              <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Blocked / Maintenance
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {standardTimeSlots.map((time) => {
                const key = `${selectedTurfForSlots}_${slotDate}_${time}`;
                const isBlocked = !!blockedSlots[key];

                return (
                  <button
                    key={time}
                    onClick={() => toggleSlotBlock(selectedTurfForSlots, slotDate, time)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isBlocked
                        ? 'bg-red-950/40 border-red-500 text-red-300 font-bold'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:border-emerald-500'
                    }`}
                  >
                    <div className="text-xs font-bold">{time}</div>
                    <div className="text-[10px] mt-1">
                      {isBlocked ? 'Blocked (Locked)' : 'Online (Available)'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PAYMENTS & SETTLEMENT TAB */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Revenue Breakdown by Gateway Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-pink-400">
                <span>bKash Checkout</span>
                <span className="w-2 h-2 rounded-full bg-pink-500"></span>
              </div>
              <div className="text-2xl font-black font-mono text-white">
                ৳
                {ownerBookings
                  .filter((b) => b.paymentMethod === 'bkash')
                  .reduce((acc, b) => acc + (b.advancePaid || 0), 0)
                  .toLocaleString()}
              </div>
              <p className="text-[11px] text-neutral-500">
                {ownerBookings.filter((b) => b.paymentMethod === 'bkash').length} verified transactions
              </p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-orange-400">
                <span>Nagad Direct</span>
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              </div>
              <div className="text-2xl font-black font-mono text-white">
                ৳
                {ownerBookings
                  .filter((b) => b.paymentMethod === 'nagad')
                  .reduce((acc, b) => acc + (b.advancePaid || 0), 0)
                  .toLocaleString()}
              </div>
              <p className="text-[11px] text-neutral-500">
                {ownerBookings.filter((b) => b.paymentMethod === 'nagad').length} verified transactions
              </p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-blue-400">
                <span>SSLCommerz (Cards/Net)</span>
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              </div>
              <div className="text-2xl font-black font-mono text-white">
                ৳
                {ownerBookings
                  .filter((b) => b.paymentMethod === 'sslcommerz')
                  .reduce((acc, b) => acc + (b.advancePaid || 0), 0)
                  .toLocaleString()}
              </div>
              <p className="text-[11px] text-neutral-500">
                {ownerBookings.filter((b) => b.paymentMethod === 'sslcommerz').length} verified transactions
              </p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                <span>Cash at Counter</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-2xl font-black font-mono text-white">
                ৳
                {ownerBookings
                  .filter((b) => b.paymentMethod === 'cash')
                  .reduce((acc, b) => acc + (b.advancePaid || 0), 0)
                  .toLocaleString()}
              </div>
              <p className="text-[11px] text-neutral-500">Collected physically at entry gate</p>
            </div>
          </div>

          {/* Settlement Request & Balance Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Settlement Request Form */}
            <div className="lg:col-span-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Request Payout Settlement
                </h3>
              </div>

              {settlementSuccessMessage && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{settlementSuccessMessage}</span>
                </div>
              )}

              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1">
                <span className="text-[11px] text-neutral-400 uppercase font-semibold">Available for Payout</span>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  ৳{Math.max(0, Math.round(totalAdvanceCollected * 0.97)).toLocaleString()} BDT
                </div>
                <p className="text-[10px] text-neutral-500">
                  Net of 3% platform commission. Min payout: ৳1,000.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (settlementAmount < 1000) {
                    alert('Minimum settlement payout amount is ৳1,000 BDT.');
                    return;
                  }
                  setSettlementSubmitting(true);
                  setTimeout(() => {
                    setSettlementSubmitting(false);
                    const newEntry = {
                      id: `SET-${Math.floor(1000 + Math.random() * 9000)}`,
                      amount: settlementAmount,
                      method: settlementMethod === 'bank' ? settlementBankName : settlementMethod.toUpperCase(),
                      account: settlementAccount,
                      date: new Date().toISOString().split('T')[0],
                      status: 'Processing Transfer',
                    };
                    setSettlementsList([newEntry, ...settlementsList]);
                    setSettlementSuccessMessage(
                      `Settlement request for ৳${settlementAmount.toLocaleString()} submitted. Funds will be credited within 24 business hours.`
                    );
                    setTimeout(() => setSettlementSuccessMessage(null), 6000);
                  }, 800);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Payout Channel</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettlementMethod('bkash')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border text-center transition-all ${
                        settlementMethod === 'bkash'
                          ? 'bg-pink-950/60 border-pink-500 text-pink-300'
                          : 'bg-neutral-850 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      bKash
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettlementMethod('nagad')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border text-center transition-all ${
                        settlementMethod === 'nagad'
                          ? 'bg-orange-950/60 border-orange-500 text-orange-300'
                          : 'bg-neutral-850 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      Nagad
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettlementMethod('bank')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border text-center transition-all ${
                        settlementMethod === 'bank'
                          ? 'bg-blue-950/60 border-blue-500 text-blue-300'
                          : 'bg-neutral-850 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      Bank
                    </button>
                  </div>
                </div>

                {settlementMethod === 'bank' && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Bank Name</label>
                    <select
                      value={settlementBankName}
                      onChange={(e) => setSettlementBankName(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="BRAC Bank Ltd">BRAC Bank Ltd</option>
                      <option value="City Bank Ltd">The City Bank Ltd</option>
                      <option value="Eastern Bank Ltd (EBL)">Eastern Bank Ltd (EBL)</option>
                      <option value="Dutch-Bangla Bank (DBBL)">Dutch-Bangla Bank (DBBL)</option>
                      <option value="Islami Bank Bangladesh">Islami Bank Bangladesh</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    {settlementMethod === 'bank' ? 'Account Number / IBAN' : 'Merchant Wallet Mobile No.'}
                  </label>
                  <input
                    type="text"
                    value={settlementAccount}
                    onChange={(e) => setSettlementAccount(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Payout Amount (৳ BDT)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={500}
                    value={settlementAmount}
                    onChange={(e) => setSettlementAmount(Number(e.target.value))}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-xs text-white font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={settlementSubmitting}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{settlementSubmitting ? 'Submitting Request...' : 'Request Payout Settlement'}</span>
                </button>
              </form>
            </div>

            {/* Settlement Payout History Ledger */}
            <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Settlement Payout History
                  </h3>
                </div>
                <span className="text-xs text-neutral-400 font-mono">
                  {settlementsList.length} settlements
                </span>
              </div>

              <div className="divide-y divide-neutral-800/80">
                {settlementsList.map((st) => (
                  <div key={st.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">{st.id}</span>
                        <span className="text-neutral-500">•</span>
                        <span className="text-neutral-300 font-medium">{st.method}</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                        Acc: {st.account} • {st.date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-emerald-400">
                        ৳{st.amount.toLocaleString()}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          st.status.includes('Settled')
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {st.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Received View (Audit Table) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  Customer Payments Received Ledger
                </span>
              </div>
              <span className="text-xs text-neutral-400 font-mono">
                {ownerBookings.length} total payments
              </span>
            </div>

            {ownerBookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400">
                No customer payments logged for your turfs yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-850 text-neutral-400 border-b border-neutral-800 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Booking / TrxID</th>
                      <th className="py-3 px-4">Turf Arena</th>
                      <th className="py-3 px-4">Player Details</th>
                      <th className="py-3 px-4">Gateway</th>
                      <th className="py-3 px-4">Advance Paid</th>
                      <th className="py-3 px-4">Due at Counter</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-neutral-300">
                    {ownerBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-neutral-850/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-emerald-400">#{b.bookingCode}</div>
                          <div className="text-[10px] text-neutral-500 font-mono">
                            {b.transactionId || `TRX_${b.bookingCode}`}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{b.turfName}</div>
                          <div className="text-[10px] text-neutral-400">
                            {b.date} • {b.startTime}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white font-medium">{b.userName}</div>
                          <div className="text-[10px] text-neutral-400">{b.userPhone}</div>
                        </td>
                        <td className="py-3 px-4">
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
                            {(b.paymentMethod || 'bkash').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          ৳{b.advancePaid.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {b.dueAmount > 0 ? (
                            <span className="text-amber-400 font-semibold">৳{b.dueAmount}</span>
                          ) : (
                            <span className="text-emerald-400 text-[10px]">Fully Paid</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedPaymentBookingForReceipt(b)}
                            className="px-2.5 py-1 text-[11px] font-bold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-lg transition-colors cursor-pointer"
                          >
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD NEW TURF MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-bold text-white">List a New Turf on TurfBD</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Submit your sports arena for booking. Listings will be reviewed and approved by the TurfBD team.
              </p>
            </div>

            <form onSubmit={handleCreateTurf} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Turf Name</label>
                <input
                  type="text"
                  value={newTurfName}
                  onChange={(e) => setNewTurfName(e.target.value)}
                  placeholder="e.g. Dhanmondi Strikers Turf"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">City</label>
                  <select
                    value={newTurfCity}
                    onChange={(e) => setNewTurfCity(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="Dhaka">Dhaka</option>
                    <option value="Chattogram">Chattogram</option>
                    <option value="Sylhet">Sylhet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Area</label>
                  <input
                    type="text"
                    value={newTurfArea}
                    onChange={(e) => setNewTurfArea(e.target.value)}
                    placeholder="e.g. Dhanmondi, Gulshan, Uttara"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Full Ground Address</label>
                <input
                  type="text"
                  value={newTurfAddress}
                  onChange={(e) => setNewTurfAddress(e.target.value)}
                  placeholder="Plot 12, Road 4, Sector 7..."
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Standard Hourly Rate (BDT ৳)</label>
                  <input
                    type="number"
                    value={newTurfHourlyRate}
                    onChange={(e) => setNewTurfHourlyRate(Number(e.target.value))}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-xs text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Peak Floodlight Rate (BDT ৳)</label>
                  <input
                    type="number"
                    value={newTurfPeakRate}
                    onChange={(e) => setNewTurfPeakRate(Number(e.target.value))}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-xs text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Pitch Size</label>
                  <input
                    type="text"
                    value={newTurfSize}
                    onChange={(e) => setNewTurfSize(e.target.value)}
                    placeholder="7 vs 7 / 5 vs 5"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Grass Type</label>
                  <input
                    type="text"
                    value={newTurfSurface}
                    onChange={(e) => setNewTurfSurface(e.target.value)}
                    placeholder="50mm Artificial Turf"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Supported Sports */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Sports Supported</label>
                <div className="flex flex-wrap gap-2">
                  {(['football', 'cricket', 'badminton', 'futsal'] as SportType[]).map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => toggleSport(sp)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        newTurfSports.includes(sp)
                          ? 'bg-emerald-500 text-neutral-950 font-bold'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}
                    >
                      {sp === 'football' ? '⚽ Football' : sp === 'cricket' ? '🏏 Cricket' : sp === 'badminton' ? '🏸 Badminton' : '🥅 Futsal'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amenities checkboxes */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Amenities Available</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AMENITY_LIST.map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`p-2 rounded-xl text-xs text-left transition-colors border ${
                        newTurfAmenities.includes(amenity)
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-semibold'
                          : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                      }`}
                    >
                      {newTurfAmenities.includes(amenity) ? '✓ ' : '+ '} {amenity}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Turf Photo URL</label>
                <input
                  type="url"
                  value={newTurfImageUrl}
                  onChange={(e) => setNewTurfImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  Submit Turf for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Details & Voucher Modal */}
      {selectedBookingForDetails && (
        <BookingDetailsModal
          booking={selectedBookingForDetails}
          turf={turfs.find((t) => t.id === selectedBookingForDetails.turfId)}
          onClose={() => setSelectedBookingForDetails(null)}
          canManage={true}
        />
      )}

      {/* Payment Receipt Modal for Owner */}
      {selectedPaymentBookingForReceipt && (
        <PaymentReceiptModal
          booking={selectedPaymentBookingForReceipt}
          onClose={() => setSelectedPaymentBookingForReceipt(null)}
          transactionId={selectedPaymentBookingForReceipt.transactionId}
          paymentMethod={selectedPaymentBookingForReceipt.paymentMethod}
          paymentAmount={selectedPaymentBookingForReceipt.advancePaid}
        />
      )}
    </div>
  );
};
