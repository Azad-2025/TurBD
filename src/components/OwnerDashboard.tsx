import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
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
  Upload,
} from 'lucide-react';
import { Turf, SportType, Booking } from '../types';
import { BANGLADESH_CITIES, DHAKA_AREAS, AMENITY_LIST } from '../data/mockData';
import { BookingDetailsModal } from './BookingDetailsModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { GateCheckInModal } from './GateCheckInModal';
import { OwnerVerificationStatusView } from './owner/OwnerVerificationStatusView';
import { OwnerGalleryModal } from './owner/OwnerGalleryModal';
import { OwnerPricingModal } from './owner/OwnerPricingModal';
import { AdvancedSlotManagement } from './owner/AdvancedSlotManagement';
import { OwnerPayoutSection } from './owner/OwnerPayoutSection';
import {
  Receipt,
  CreditCard,
  Wallet,
  Landmark,
  Check,
  Copy,
  ArrowUpRight,
  Send,
  Scan,
  QrCode,
  Image as ImageIcon,
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
    refreshBookings,
    setActiveTab: setActiveTabApp,
  } = useApp();

  // Strict Turf Owner / Admin Access Guard
  const isOwner =
    currentUser?.role === 'owner' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin' ||
    Boolean(currentUser?.isSuperAdmin);

  if (!currentUser || !isOwner) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center" id="owner-access-denied">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-card">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-[#0F172A] mb-2">Turf Owner Access Required</h2>
          <p className="text-xs text-[#64748B] mb-6 leading-relaxed">
            The Turf Management Portal is designed for registered facility owners and managers. Your current role is ({currentUser?.role || 'Guest'}).
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setActiveTabApp('home')}
              className="px-5 py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Turf Owner Verification Guard (Part A2: Pending/Rejected/Suspended owners cannot access operational dashboard)
  if (currentUser.role === 'owner' && currentUser.ownerVerificationStatus !== 'approved') {
    return <OwnerVerificationStatusView />;
  }

  // Filter turfs owned by this owner
  const ownerTurfs = turfs.filter(
    (t) =>
      t.ownerId === currentUser?.id ||
      currentUser?.role === 'admin' ||
      currentUser?.role === 'super_admin' ||
      Boolean(currentUser?.isSuperAdmin)
  );

  const [activeTab, setActiveTab] = useState<'overview' | 'turfs' | 'bookings' | 'slots' | 'payments'>('overview');
  const [galleryModalTurf, setGalleryModalTurf] = useState<Turf | null>(null);
  const [pricingModalTurf, setPricingModalTurf] = useState<Turf | null>(null);
  const [isGateCheckInOpen, setIsGateCheckInOpen] = useState(false);
  const [selectedTurfForSlots, setSelectedTurfForSlots] = useState<string>(ownerTurfs[0]?.id || '');
  const [selectedPaymentBookingForReceipt, setSelectedPaymentBookingForReceipt] = useState<Booking | null>(null);
  const [settlementAmount, setSettlementAmount] = useState<number>(5000);
  const [settlementMethod, setSettlementMethod] = useState<'bkash' | 'nagad' | 'bank'>('bkash');
  const [settlementAccount, setSettlementAccount] = useState<string>(currentUser?.phone || '');
  const [settlementBankName, setSettlementBankName] = useState<string>('BRAC Bank Ltd');
  const [settlementSubmitting, setSettlementSubmitting] = useState<boolean>(false);
  const [settlementSuccessMessage, setSettlementSuccessMessage] = useState<string | null>(null);
  const [settlementsList, setSettlementsList] = useState<any[]>([]);
  const [slotDate, setSlotDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Real Database Financial Data
  const [financials, setFinancials] = useState<{
    summary: {
      totalGrossRevenue: number;
      onlineAdvanceCollected: number;
      pendingGroundDue: number;
      platformCommission: number;
      netPayoutOwed: number;
      successfulCount: number;
    };
    gatewayBreakdown: { bkash: number; nagad: number; sslcommerz: number; cash: number };
    payments: any[];
  } | null>(null);
  const [loadingFinancials, setLoadingFinancials] = useState(false);

  useEffect(() => {
    if (isOwner) {
      setLoadingFinancials(true);
      api.getOwnerPayments()
        .then((data) => {
          setFinancials(data);
          if (data.summary?.netPayoutOwed) {
            setSettlementAmount(Math.min(10000, data.summary.netPayoutOwed));
          }
        })
        .catch((err) => console.warn('Failed to load owner financial data:', err))
        .finally(() => setLoadingFinancials(false));
    }
  }, [isOwner, activeTab]);

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
  const [newTurfFile, setNewTurfFile] = useState<File | null>(null);
  const [newTurfFilePreview, setNewTurfFilePreview] = useState<string>('');
  const [isSubmittingTurf, setIsSubmittingTurf] = useState(false);
  const [createTurfError, setCreateTurfError] = useState('');

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

  const handleCreateTurf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTurfName.trim() || !newTurfAddress.trim()) return;

    setIsSubmittingTurf(true);
    setCreateTurfError('');

    try {
      let finalImageUrl = newTurfImageUrl.trim();

      if (newTurfFile) {
        const formData = new FormData();
        formData.append('images', newTurfFile);
        formData.append('image', newTurfFile);
        formData.append('category', 'main_image');
        const uploadRes = await api.uploadImage(formData);
        finalImageUrl = uploadRes.url || uploadRes.imageUrl || finalImageUrl;
      }

      await addTurf({
        name: newTurfName.trim(),
        tagline: `Premier ${newTurfSize} arena in ${newTurfArea}, ${newTurfCity}`,
        description:
          newTurfDescription.trim() ||
          `Modern turf facility in ${newTurfArea} equipped with high grade artificial grass, bright floodlights, and clean changing rooms.`,
        city: newTurfCity,
        area: newTurfArea,
        address: newTurfAddress.trim(),
        sports: newTurfSports,
        size: newTurfSize,
        surface: newTurfSurface,
        hourlyRate: Number(newTurfHourlyRate),
        peakHourRate: Number(newTurfPeakRate),
        images: [finalImageUrl],
        amenities: newTurfAmenities,
        ownerId: currentUser?.id || 'user-owner-1',
        ownerName: currentUser?.name || 'Turf Owner',
        ownerPhone: currentUser?.phone || '+880 1819-876543',
        openingTime: '06:00',
        closingTime: '02:00',
      });

      setIsAddModalOpen(false);
      setActiveTab('turfs');
      // Reset form
      setNewTurfName('');
      setNewTurfAddress('');
      setNewTurfDescription('');
      setNewTurfFile(null);
      if (newTurfFilePreview) URL.revokeObjectURL(newTurfFilePreview);
      setNewTurfFilePreview('');
    } catch (err: any) {
      setCreateTurfError(err.message || 'Failed to submit turf. Please check image upload.');
    } finally {
      setIsSubmittingTurf(false);
    }
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-[#0F172A]" id="owner-dashboard-page">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-card">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-[#064E3B] border border-emerald-200">
              Turf Management Portal
            </span>
            <span className="text-xs text-[#64748B]">
              Logged in as <strong className="text-[#0F172A]">{currentUser?.name}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
            Owner Dashboard
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Manage your arena listings, track daily bookings, verify payments, and control slot availability.
          </p>
        </div>

        {/* Quick action: Gate Check-In & Add new turf */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsGateCheckInOpen(true)}
            className="px-4 py-2.5 bg-[#064E3B] hover:bg-[#043729] text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-soft cursor-pointer"
            id="owner-gate-checkin-top-btn"
          >
            <Scan className="w-4 h-4 text-[#0FA958]" />
            <span>Gate Check-In (QR)</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-soft cursor-pointer"
            id="owner-add-turf-btn"
          >
            <PlusCircle className="w-4 h-4" />
            <span>List New Turf</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl mb-6 overflow-x-auto shadow-card gap-1">
        <button
          onClick={() => setIsGateCheckInOpen(true)}
          className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer bg-emerald-50 text-[#064E3B] hover:bg-emerald-100 border border-emerald-200"
        >
          <Scan className="w-3.5 h-3.5 text-[#0FA958]" />
          <span>Scan Match Pass</span>
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'overview' ? 'bg-[#064E3B] text-white shadow-soft' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
          }`}
        >
          Financial Overview
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'bookings' ? 'bg-[#064E3B] text-white shadow-soft' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
          }`}
        >
          <span>Slot Bookings ({ownerBookings.length})</span>
          {pendingApprovalsCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center">
              {pendingApprovalsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('turfs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'turfs' ? 'bg-[#064E3B] text-white shadow-soft' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
          }`}
        >
          <span>My Listed Turfs ({ownerTurfs.length})</span>
          {pendingTurfsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-amber-50 text-amber-800 border border-amber-200 font-bold">
              {pendingTurfsCount} pending review
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('slots')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'slots' ? 'bg-[#064E3B] text-white shadow-soft' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
          }`}
        >
          Slot Availability Schedule
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'payments' ? 'bg-[#064E3B] text-white shadow-soft' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
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
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Total Pitch Revenue
              </div>
              <div className="text-2xl font-black text-[#064E3B] font-mono">
                BDT {totalRevenue.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">From all confirmed match bookings</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                bKash/Nagad Advance Received
              </div>
              <div className="text-2xl font-black text-[#0FA958] font-mono">
                BDT {totalAdvanceCollected.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#064E3B] font-semibold mt-1">✓ Instantly verified tokens</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Due on Field Arrival
              </div>
              <div className="text-2xl font-black text-amber-600 font-mono">
                BDT {pendingDueAmount.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Cash / MFS balance on arrival</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Active Venues
              </div>
              <div className="text-2xl font-black text-[#0F172A]">
                {ownerTurfs.length} Arenas
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                <span className="text-[#0FA958] font-semibold">{ownerTurfs.filter((t) => t.status === 'approved').length} Live</span>
                {pendingTurfsCount > 0 && (
                  <span className="text-amber-600 font-semibold ml-1.5">• {pendingTurfsCount} Pending</span>
                )}
              </div>
            </div>
          </div>

          {/* Pending Venue Verification Alert */}
          {pendingTurfsCount > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between shadow-soft">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    {pendingTurfsCount} Venue{pendingTurfsCount > 1 ? 's' : ''} Awaiting Admin Verification
                  </h4>
                  <p className="text-[11px] text-amber-800/80">
                    Newly submitted turfs are held in the admin approval queue and remain hidden from public browse until verified.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('turfs')}
                className="px-3 py-1.5 bg-white hover:bg-amber-100/50 text-amber-800 font-bold text-xs rounded-xl border border-amber-300 transition-colors shrink-0 cursor-pointer"
              >
                View Status
              </button>
            </div>
          )}

          {/* Pending Action Alerts */}
          {pendingApprovalsCount > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between shadow-soft">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    {pendingApprovalsCount} Booking{pendingApprovalsCount > 1 ? 's' : ''} Awaiting Owner Approval
                  </h4>
                  <p className="text-[11px] text-amber-800/80">
                    Players have sent advance tokens and are waiting for match slot confirmation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('bookings')}
                className="px-3.5 py-1.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold text-xs rounded-xl cursor-pointer shadow-soft transition-colors"
              >
                Review Bookings
              </button>
            </div>
          )}

          {/* Recent Bookings Quick Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
            <h3 className="text-sm font-bold text-[#0F172A] mb-4">Latest Match Reservations</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[#64748B] bg-slate-50/50">
                    <th className="py-3 px-3 font-semibold">Booking ID</th>
                    <th className="py-3 px-3 font-semibold">Arena</th>
                    <th className="py-3 px-3 font-semibold">Player</th>
                    <th className="py-3 px-3 font-semibold">Date &amp; Time</th>
                    <th className="py-3 px-3 font-semibold">Advance Paid</th>
                    <th className="py-3 px-3 font-semibold">Due on Field</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ownerBookings.slice(0, 5).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#064E3B]">#{b.bookingCode}</td>
                      <td className="py-3 px-3 font-semibold text-[#0F172A]">{b.turfName}</td>
                      <td className="py-3 px-3 text-slate-700">
                        <div>{b.userName}</div>
                        <div className="text-[10px] text-slate-500">{b.userPhone}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        <div>{b.date}</div>
                        <div className="text-[10px] font-mono text-[#064E3B]">{b.startTime} - {b.endTime}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[#0FA958]">BDT {b.advancePaid}</td>
                      <td className="py-3 px-3 font-mono font-bold text-amber-600">BDT {b.dueAmount}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          b.status === 'confirmed' ? 'bg-emerald-50 text-[#064E3B] border border-emerald-200' :
                          b.status === 'pending_approval' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-600'
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
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-card">
            <div>
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#0FA958]" />
                <span>Arena Bookings &amp; Daily Match Schedule</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Manage live slot reservations, daily pitch schedule, player check-ins, and cancellation requests.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Turf Filter */}
              <select
                value={ownerBookingTurfFilter}
                onChange={(e) => setOwnerBookingTurfFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0F172A] font-medium cursor-pointer focus:outline-none focus:border-[#0FA958]"
              >
                <option value="all">All Arenas ({ownerTurfs.length})</option>
                {ownerTurfs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {/* View Switcher: Daily Schedule vs Matches List */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setBookingViewMode('schedule')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    bookingViewMode === 'schedule'
                      ? 'bg-white text-[#064E3B] shadow-sm'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Daily Schedule
                </button>
                <button
                  onClick={() => setBookingViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    bookingViewMode === 'list'
                      ? 'bg-white text-[#064E3B] shadow-sm'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Matches List ({ownerBookings.length})
                </button>
              </div>

              <button
                onClick={() => refreshBookings()}
                className="p-2 text-slate-500 hover:text-[#0F172A] bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
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
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#0FA958]" />
                    <span>Select Schedule Date:</span>
                    <span className="text-[#064E3B] font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {bookingCalendarDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 hidden sm:inline">Jump to:</label>
                    <input
                      type="date"
                      value={bookingCalendarDate}
                      onChange={(e) => setBookingCalendarDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-[#0F172A] focus:outline-none focus:border-[#0FA958]"
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
                            ? 'bg-[#0FA958] border-[#0FA958] text-white font-bold shadow-soft scale-105'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-[#0F172A]'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold tracking-wider">{dayName}</span>
                        <span className="text-lg font-black">{dayNum}</span>
                        <span className="text-[10px] opacity-80">{monthName}</span>
                        {matchesOnThisDay > 0 && (
                          <span
                            className={`mt-1 text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                              isSelected ? 'bg-white text-[#064E3B]' : 'bg-emerald-100 text-[#064E3B]'
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
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                      <span>Daily Schedule for {bookingCalendarDate}</span>
                      {ownerBookingTurfFilter !== 'all' && (
                        <span className="text-xs text-slate-500 font-normal">
                          ({ownerTurfs.find((t) => t.id === ownerBookingTurfFilter)?.name})
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review confirmed bookings, walk-in locks, or click any slot to lock for maintenance.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0FA958]"></span> Confirmed
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Blocked / Maintenance
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Available
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
                            ? 'bg-emerald-50/40 border-emerald-200 shadow-soft'
                            : isBlocked
                            ? 'bg-red-50/50 border-red-200 text-red-800'
                            : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-mono text-sm font-black text-[#0F172A] flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-[#0FA958]" />
                              <span>{time}</span>
                            </span>

                            {matchedBooking ? (
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                  matchedBooking.status === 'confirmed'
                                    ? 'bg-emerald-50 text-[#064E3B] border border-emerald-200'
                                    : matchedBooking.status === 'cancellation_requested'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                                }`}
                              >
                                {matchedBooking.status === 'cancellation_requested'
                                  ? 'Cancel Request'
                                  : matchedBooking.status}
                              </span>
                            ) : isBlocked ? (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                                Blocked / Lock
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                Available
                              </span>
                            )}
                          </div>

                          {/* Match / Slot Details */}
                          {matchedBooking ? (
                            <div className="space-y-1.5 text-xs">
                              <div className="font-bold text-[#0F172A] flex items-center justify-between">
                                <span>{matchedBooking.userName}</span>
                                <span className="font-mono text-[#064E3B] text-xs font-bold">
                                  #{matchedBooking.bookingCode}
                                </span>
                              </div>
                              <div className="text-slate-500 flex items-center justify-between text-[11px]">
                                <span>Phone: {matchedBooking.userPhone}</span>
                                <span>BDT {matchedBooking.totalAmount}</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                                <span className="text-[#0FA958] font-bold">Paid: BDT {matchedBooking.advancePaid}</span>
                                {matchedBooking.dueAmount > 0 ? (
                                  <span className="text-amber-600 font-semibold">Due: BDT {matchedBooking.dueAmount}</span>
                                ) : (
                                  <span className="text-slate-400">Paid in full</span>
                                )}
                              </div>
                            </div>
                          ) : isBlocked ? (
                            <div className="text-xs text-red-700/80 py-2">
                              Locked for offline walk-in players or pitch maintenance.
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500 py-2">
                              Slot is open for online player bookings.
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                          {matchedBooking ? (
                            <>
                              <button
                                onClick={() => setSelectedBookingForDetails(matchedBooking)}
                                className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors border border-slate-200 cursor-pointer shadow-sm"
                              >
                                <FileText className="w-3.5 h-3.5 text-[#0FA958]" />
                                <span>View Pass</span>
                              </button>

                              <a
                                href={`tel:${matchedBooking.userPhone}`}
                                className="p-1.5 text-[#0FA958] hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
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
                                  ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                                  : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
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
                <h4 className="text-base font-bold text-[#0F172A]">Upcoming Matches &amp; Status Management</h4>
                <p className="text-xs text-[#64748B]">
                  Approve new matches, process cancellation requests, or verify player check-in vouchers.
                </p>
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 bg-white border border-slate-200 p-1.5 rounded-2xl shadow-card">
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
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        bookingStatusFilter === f.id
                          ? 'bg-[#064E3B] text-white shadow-soft'
                          : 'text-[#64748B] hover:text-[#0F172A]'
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
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs shadow-card">
                    No bookings found matching current filter criteria.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 gap-3">
                  {filteredList.map((b) => (
                    <div
                      key={b.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-all shadow-card"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-black text-[#064E3B] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            #{b.bookingCode}
                          </span>
                          <span className="text-xs font-bold text-[#0F172A]">{b.turfName}</span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              b.status === 'confirmed'
                                ? 'bg-emerald-50 text-[#064E3B] border border-emerald-200'
                                : b.status === 'pending_approval'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : b.status === 'cancellation_requested'
                                ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
                                : b.status === 'completed'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {b.status === 'cancellation_requested' ? 'Cancel Requested' : b.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1 text-slate-800 font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" /> {b.date}
                          </span>
                          <span className="flex items-center gap-1 text-[#064E3B] font-mono font-bold">
                            <Clock className="w-3.5 h-3.5 text-[#0FA958]" /> {b.startTime} - {b.endTime} ({b.durationHours}h)
                          </span>
                          <span>•</span>
                          <span className="text-slate-800">
                            Player: <strong>{b.userName}</strong> ({b.userPhone})
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs pt-1 flex-wrap">
                          <span className="text-slate-500">
                            Total Fee: <strong className="font-mono text-[#0F172A]">BDT {b.totalAmount}</strong>
                          </span>
                          <span className="text-[#0FA958] font-bold">
                            Paid: <strong className="font-mono">BDT {b.advancePaid}</strong> via {b.paymentMethod.toUpperCase()}
                            {b.transactionId && ` (Trx: ${b.transactionId})`}
                          </span>
                          {b.dueAmount > 0 ? (
                            <span className="text-amber-600 font-semibold">
                              Due at Pitch: <strong className="font-mono">BDT {b.dueAmount}</strong>
                            </span>
                          ) : (
                            <span className="text-[#064E3B] font-semibold">100% Paid</span>
                          )}
                        </div>

                        {/* Cancellation request context */}
                        {b.status === 'cancellation_requested' && (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                            <span className="font-bold block">User requested cancellation:</span>
                            <span className="text-[11px] block mt-0.5 italic">
                              "{b.cancellationReason || 'Match rescheduled by captain'}"
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Owner Actions */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 flex-wrap">
                        <button
                          onClick={() => setSelectedBookingForDetails(b)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-[#0F172A] font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#0FA958]" />
                          <span>View Voucher</span>
                        </button>

                        {b.status === 'pending_approval' && (
                          <button
                            onClick={() => updateBookingStatus(b.id, 'confirmed')}
                            className="px-3 py-1.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer shadow-soft"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}

                        {b.status === 'cancellation_requested' && (
                          <>
                            <button
                              onClick={() => {
                                if (confirm(`Approve cancellation and refund BDT ${b.advancePaid} to ${b.userName}?`)) {
                                  updateBookingStatus(b.id, 'cancelled', {
                                    refundStatus: 'refunded',
                                    refundAmount: b.advancePaid,
                                    notes: 'Cancellation and refund approved by arena manager',
                                  });
                                }
                              }}
                              className="px-3 py-1.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-soft"
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
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
                            >
                              Reject Cancel
                            </button>
                          </>
                        )}

                        {b.status === 'confirmed' && (
                          <>
                            {b.isCheckedIn ? (
                              <span className="px-2.5 py-1 bg-emerald-50 text-[#064E3B] border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#0FA958]" />
                                <span>Checked In</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedBookingForDetails(b);
                                  setIsGateCheckInOpen(true);
                                }}
                                className="px-3 py-1.5 bg-[#0FA958] hover:bg-[#064E3B] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              >
                                <Scan className="w-3.5 h-3.5" />
                                <span>Check-In</span>
                              </button>
                            )}

                            <button
                              onClick={() => updateBookingStatus(b.id, 'completed')}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
                            >
                              Mark Completed
                            </button>
                          </>
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
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                            title="Cancel Booking"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        <a
                          href={`tel:${b.userPhone}`}
                          className="p-2 text-[#0FA958] hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer"
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
            <h3 className="text-base font-bold text-[#0F172A]">Your Listed Venues</h3>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-soft transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Add Turf
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ownerTurfs.map((turf) => (
              <div
                key={turf.id}
                className={`bg-white border rounded-2xl overflow-hidden p-5 flex flex-col justify-between transition-all shadow-card ${
                  turf.status === 'pending'
                    ? 'border-amber-300 bg-amber-50/20'
                    : turf.status === 'rejected'
                    ? 'border-red-300 bg-red-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-base font-bold text-[#0F172A]">{turf.name}</h4>
                      <p className="text-xs text-[#64748B]">{turf.area}, {turf.city}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      turf.status === 'approved'
                        ? 'bg-emerald-50 text-[#064E3B] border border-emerald-200'
                        : turf.status === 'pending'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {turf.status === 'approved' && <CheckCircle2 className="w-3 h-3 text-[#0FA958]" />}
                      {turf.status === 'pending' && <Clock className="w-3 h-3 text-amber-600 animate-pulse" />}
                      {turf.status === 'rejected' && <XCircle className="w-3 h-3 text-red-600" />}
                      <span>{turf.status === 'pending' ? 'Pending Admin Approval' : turf.status}</span>
                    </span>
                  </div>

                  {/* Verification Status Context Banner */}
                  {turf.status === 'pending' && (
                    <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-800 block">Awaiting Platform Verification</span>
                        <span className="text-[11px] text-amber-900/80 leading-relaxed block mt-0.5">
                          This venue is pending review by the TurfBD Admin team. It will not appear in public searches or accept player bookings until verified and approved.
                        </span>
                      </div>
                    </div>
                  )}

                  {turf.status === 'rejected' && (
                    <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-900">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-red-800 block">Listing Rejected</span>
                        <span className="text-[11px] text-red-900/80 leading-relaxed block mt-0.5">
                          This listing did not pass platform verification. Please contact support or update the details.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Cover Photo Preview */}
                  {(turf.mainImage || turf.images?.[0]) && (
                    <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden mb-3 bg-slate-100">
                      <img
                        src={turf.mainImage || turf.images?.[0]}
                        alt={turf.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setGalleryModalTurf(turf)}
                        className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black/90 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow backdrop-blur-sm cursor-pointer transition-colors"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Manage Photos ({turf.images?.length || 0})</span>
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3">
                    <div>
                      <span className="text-[#64748B] block text-[10px]">Standard Rate:</span>
                      <span className="font-mono font-bold text-[#064E3B]">BDT {turf.hourlyRate}/hr</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[10px]">Day Slots (06-18):</span>
                      <span className="font-mono font-bold text-amber-600">
                        BDT {turf.dayPricePerHour || turf.hourlyRate}/hr
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[10px]">Night (Floodlight):</span>
                      <span className="font-mono font-bold text-indigo-700">
                        BDT {turf.nightPricePerHour || turf.peakHourRate || turf.hourlyRate}/hr
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[10px]">Dimensions:</span>
                      <span className="text-[#0F172A] font-semibold">{turf.size}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 text-[10px] text-[#64748B] mb-3">
                    {turf.amenities.map((a, i) => (
                      <span key={i} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[#64748B]">
                    Rating: <strong className="text-[#0F172A]">★ {turf.rating}</strong> ({turf.reviewCount} reviews)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGalleryModalTurf(turf)}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-[#0F172A] rounded-xl border border-slate-200 flex items-center gap-1 font-semibold cursor-pointer shadow-sm transition-colors text-[11px]"
                    >
                      <ImageIcon className="w-3 h-3 text-[#0FA958]" />
                      <span>Gallery</span>
                    </button>

                    <button
                      onClick={() => setPricingModalTurf(turf)}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl border border-amber-200 flex items-center gap-1 font-semibold cursor-pointer shadow-sm transition-colors text-[11px]"
                    >
                      <DollarSign className="w-3 h-3 text-amber-600" />
                      <span>Pricing Rules</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADVANCED SLOT AVAILABILITY SCHEDULE TAB */}
      {activeTab === 'slots' && (
        <AdvancedSlotManagement
          turfs={ownerTurfs}
          selectedTurfId={selectedTurfForSlots || ownerTurfs[0]?.id || ''}
          onSelectTurf={(id) => setSelectedTurfForSlots(id)}
          currentUser={currentUser}
        />
      )}

      {/* PAYMENTS & SETTLEMENT TAB */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <OwnerPayoutSection
            financials={financials}
            onRefreshFinancials={() => {
              api.getOwnerPayments().then(setFinancials).catch(console.warn);
            }}
            currentUser={currentUser}
          />

          {/* Payment Received View (Audit Table) */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#0FA958]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                  Customer Payments Received Ledger
                </span>
              </div>
              <span className="text-xs text-[#64748B] font-mono">
                {ownerBookings.length} total payments
              </span>
            </div>

            {ownerBookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No customer payments logged for your turfs yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[#64748B] border-b border-slate-200 font-bold uppercase text-[10px]">
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
                  <tbody className="divide-y divide-slate-100 text-[#0F172A]">
                    {ownerBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-[#064E3B]">#{b.bookingCode}</div>
                          <div className="text-[10px] text-[#64748B] font-mono">
                            {b.transactionId || `TRX_${b.bookingCode}`}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#0F172A]">{b.turfName}</div>
                          <div className="text-[10px] text-[#64748B]">
                            {b.date} • {b.startTime}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-[#0F172A] font-medium">{b.userName}</div>
                          <div className="text-[10px] text-[#64748B]">{b.userPhone}</div>
                        </td>
                        <td className="py-3 px-4">
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
                            {(b.paymentMethod || 'bkash').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#0FA958]">
                          BDT {b.advancePaid.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {b.dueAmount > 0 ? (
                            <span className="text-amber-700 font-semibold">BDT {b.dueAmount}</span>
                          ) : (
                            <span className="text-[#064E3B] text-[10px] font-semibold">Fully Paid</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedPaymentBookingForReceipt(b)}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-[#0F172A] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-bold text-[#0F172A]">List a New Turf on TurfBD</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Submit your sports arena for booking. Listings will be reviewed and approved by the TurfBD team.
              </p>
            </div>

            <form onSubmit={handleCreateTurf} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Turf Name</label>
                <input
                  type="text"
                  value={newTurfName}
                  onChange={(e) => setNewTurfName(e.target.value)}
                  placeholder="e.g. Dhanmondi Strikers Turf"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0FA958]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <select
                    value={newTurfCity}
                    onChange={(e) => setNewTurfCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0FA958]"
                  >
                    <option value="Dhaka">Dhaka</option>
                    <option value="Chattogram">Chattogram</option>
                    <option value="Sylhet">Sylhet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Area</label>
                  <input
                    type="text"
                    value={newTurfArea}
                    onChange={(e) => setNewTurfArea(e.target.value)}
                    placeholder="e.g. Dhanmondi, Gulshan, Uttara"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0FA958]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Ground Address</label>
                <input
                  type="text"
                  value={newTurfAddress}
                  onChange={(e) => setNewTurfAddress(e.target.value)}
                  placeholder="Plot 12, Road 4, Sector 7..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0FA958]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Hourly Rate (BDT)</label>
                  <input
                    type="number"
                    value={newTurfHourlyRate}
                    onChange={(e) => setNewTurfHourlyRate(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-[#0F172A] font-mono focus:outline-none focus:border-[#0FA958]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Peak Floodlight Rate (BDT)</label>
                  <input
                    type="number"
                    value={newTurfPeakRate}
                    onChange={(e) => setNewTurfPeakRate(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-[#0F172A] font-mono focus:outline-none focus:border-[#0FA958]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pitch Size</label>
                  <input
                    type="text"
                    value={newTurfSize}
                    onChange={(e) => setNewTurfSize(e.target.value)}
                    placeholder="7 vs 7 / 5 vs 5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0FA958]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Grass Type</label>
                  <input
                    type="text"
                    value={newTurfSurface}
                    onChange={(e) => setNewTurfSurface(e.target.value)}
                    placeholder="50mm Artificial Turf"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0FA958]"
                  />
                </div>
              </div>

              {/* Supported Sports */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Sports Supported</label>
                <div className="flex flex-wrap gap-2">
                  {(['football', 'cricket', 'badminton', 'futsal'] as SportType[]).map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => toggleSport(sp)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        newTurfSports.includes(sp)
                          ? 'bg-[#064E3B] text-white shadow-soft'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sp === 'football' ? '⚽ Football' : sp === 'cricket' ? '🏏 Cricket' : sp === 'badminton' ? '🏸 Badminton' : '🥅 Futsal'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amenities checkboxes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Amenities Available</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AMENITY_LIST.map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`p-2 rounded-xl text-xs text-left transition-colors border cursor-pointer ${
                        newTurfAmenities.includes(amenity)
                          ? 'bg-emerald-50 border-emerald-300 text-[#064E3B] font-semibold shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {newTurfAmenities.includes(amenity) ? '✓ ' : '+ '} {amenity}
                    </button>
                  ))}
                </div>
              </div>

              {createTurfError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{createTurfError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Turf Main Photo</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Upload from Computer / Gallery</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setNewTurfFile(file);
                        if (newTurfFilePreview) URL.revokeObjectURL(newTurfFilePreview);
                        setNewTurfFilePreview(file ? URL.createObjectURL(file) : '');
                      }}
                      className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#0FA958]/10 file:text-[#064E3B] hover:file:bg-[#0FA958]/20 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Or Direct Photo URL</label>
                    <input
                      type="url"
                      value={newTurfImageUrl}
                      onChange={(e) => setNewTurfImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0FA958]"
                    />
                  </div>
                </div>

                {newTurfFilePreview && (
                  <div className="relative inline-block mt-2 rounded-xl overflow-hidden border border-slate-200">
                    <img
                      src={newTurfFilePreview}
                      alt="Selected preview"
                      className="w-32 h-20 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newTurfFilePreview) URL.revokeObjectURL(newTurfFilePreview);
                        setNewTurfFile(null);
                        setNewTurfFilePreview('');
                      }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center text-[10px] cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmittingTurf}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-[#0F172A] cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTurf}
                  className="px-6 py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold text-xs rounded-xl shadow-soft cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingTurf ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading & Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Turf for Approval</span>
                  )}
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

      {/* Gate Check-In & Pass Scanner Modal */}
      {isGateCheckInOpen && (
        <GateCheckInModal
          turfs={ownerTurfs}
          onClose={() => setIsGateCheckInOpen(false)}
          onCheckInComplete={() => {
            refreshBookings();
          }}
        />
      )}

      {/* Turf Photo Gallery Manager Modal */}
      {galleryModalTurf && (
        <OwnerGalleryModal
          turf={galleryModalTurf}
          onClose={() => setGalleryModalTurf(null)}
          onUpdated={(updated) => {
            updateTurf(updated.id, updated);
            setGalleryModalTurf(null);
          }}
        />
      )}

      {/* Turf Dynamic Pricing Rules Modal */}
      {pricingModalTurf && (
        <OwnerPricingModal
          turf={pricingModalTurf}
          onClose={() => setPricingModalTurf(null)}
          onUpdated={(updated) => {
            updateTurf(updated.id, updated);
            setPricingModalTurf(null);
          }}
        />
      )}
    </div>
  );
};
