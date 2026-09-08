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
} from 'lucide-react';
import { Turf, SportType } from '../types';
import { BANGLADESH_CITIES, DHAKA_AREAS, AMENITY_LIST } from '../data/mockData';

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
  } = useApp();

  // If current user is not owner, prompt or allow 1-click switch
  const isOwner = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  // Filter turfs owned by this owner (or show owner's turfs from mock if testing)
  const ownerTurfs = turfs.filter(
    (t) => t.ownerId === currentUser?.id || currentUser?.role === 'admin' || t.ownerId === 'user-owner-1'
  );

  const [activeTab, setActiveTab] = useState<'overview' | 'turfs' | 'bookings' | 'slots'>('overview');
  const [selectedTurfForSlots, setSelectedTurfForSlots] = useState<string>(ownerTurfs[0]?.id || '');
  const [slotDate, setSlotDate] = useState<string>(new Date().toISOString().split('T')[0]);

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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">All Slot Bookings for Your Turfs</h3>
            <span className="text-xs text-neutral-400">{ownerBookings.length} total records</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {ownerBookings.map((b) => (
              <div
                key={b.id}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      #{b.bookingCode}
                    </span>
                    <span className="text-xs font-bold text-white">{b.turfName}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      b.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                      b.status === 'pending_approval' ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-800 text-neutral-500'
                    }`}>
                      {b.status.replace('_', ' ')}
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
                    <span className="text-white">Player: <strong>{b.userName}</strong> ({b.userPhone})</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs pt-1">
                    <span className="text-neutral-400">
                      Pitch Fee: <strong className="font-mono text-white">৳{b.totalAmount}</strong>
                    </span>
                    <span className="text-emerald-400">
                      Paid: <strong className="font-mono">৳{b.advancePaid}</strong> via {b.paymentMethod.toUpperCase()}
                      {b.transactionId && ` (Trx: ${b.transactionId})`}
                    </span>
                    {b.dueAmount > 0 && (
                      <span className="text-amber-400">
                        Due: <strong className="font-mono">৳{b.dueAmount}</strong>
                      </span>
                    )}
                  </div>
                  {b.notes && (
                    <p className="text-[11px] text-neutral-400 italic">Note: "{b.notes}"</p>
                  )}
                </div>

                {/* Owner Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-800">
                  {b.status === 'pending_approval' && (
                    <button
                      onClick={() => updateBookingStatus(b.id, 'confirmed')}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Booking</span>
                    </button>
                  )}

                  {b.status === 'confirmed' && (
                    <button
                      onClick={() => updateBookingStatus(b.id, 'completed')}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 font-semibold text-xs rounded-xl border border-neutral-700 transition-colors"
                    >
                      Mark Completed
                    </button>
                  )}

                  {b.status !== 'cancelled' && (
                    <button
                      onClick={() => {
                        if (confirm('Cancel this match booking?')) {
                          updateBookingStatus(b.id, 'cancelled');
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
    </div>
  );
};
