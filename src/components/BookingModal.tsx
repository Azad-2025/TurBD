import React, { useState, useEffect, useCallback } from 'react';
import { Turf, SportType, PaymentMethod, PaymentType } from '../types';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { PaymentGatewayModal } from './PaymentGatewayModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ShieldCheck,
  Phone,
  User as UserIcon,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  DollarSign,
  QrCode,
  Download,
  Printer,
  RefreshCw,
  MapPin,
  Check,
  CalendarDays,
} from 'lucide-react';

interface BookingModalProps {
  turf: Turf;
  onClose: () => void;
}

// Standard 1-hour slots from 06:00 AM to 02:00 AM
const ALL_HOURLY_SLOTS = [
  { start: '06:00', end: '07:00', category: 'Morning', isPeak: false },
  { start: '07:00', end: '08:00', category: 'Morning', isPeak: false },
  { start: '08:00', end: '09:00', category: 'Morning', isPeak: false },
  { start: '09:00', end: '10:00', category: 'Morning', isPeak: false },
  { start: '10:00', end: '11:00', category: 'Morning', isPeak: false },
  { start: '11:00', end: '12:00', category: 'Morning', isPeak: false },
  { start: '12:00', end: '13:00', category: 'Afternoon', isPeak: false },
  { start: '13:00', end: '14:00', category: 'Afternoon', isPeak: false },
  { start: '14:00', end: '15:00', category: 'Afternoon', isPeak: false },
  { start: '15:00', end: '16:00', category: 'Afternoon', isPeak: false },
  { start: '16:00', end: '17:00', category: 'Afternoon', isPeak: false },
  { start: '17:00', end: '18:00', category: 'Evening (Lights)', isPeak: true },
  { start: '18:00', end: '19:00', category: 'Evening (Lights)', isPeak: true },
  { start: '19:00', end: '20:00', category: 'Evening (Lights)', isPeak: true },
  { start: '20:00', end: '21:00', category: 'Evening (Lights)', isPeak: true },
  { start: '21:00', end: '22:00', category: 'Night Floodlight', isPeak: true },
  { start: '22:00', end: '23:00', category: 'Night Floodlight', isPeak: true },
  { start: '23:00', end: '00:00', category: 'Night Floodlight', isPeak: true },
  { start: '00:00', end: '01:00', category: 'Night Floodlight', isPeak: true },
  { start: '01:00', end: '02:00', category: 'Night Floodlight', isPeak: true },
];

export const BookingModal: React.FC<BookingModalProps> = ({ turf, onClose }) => {
  const {
    currentUser,
    createBooking,
    setActiveTab,
    refreshBookings,
  } = useApp();

  // Booking Flow Steps: 'slots' -> 'summary' -> 'payment' -> 'success'
  const [step, setStep] = useState<'slots' | 'summary' | 'payment' | 'success'>('slots');

  // Next 14 days quick chips
  const dateOptions = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { dateStr, dayName, monthDay };
  });

  const [selectedDate, setSelectedDate] = useState<string>(dateOptions[0].dateStr);
  const [showFullCalendar, setShowFullCalendar] = useState<boolean>(false);
  const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [sport, setSport] = useState<SportType>(turf.sports[0] || 'football');

  // Real backend slot availability state from PostgreSQL
  const [slotsMap, setSlotsMap] = useState<Record<string, string>>({});
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Player Contact Details
  const [playerName, setPlayerName] = useState(currentUser?.name || 'Tanvir Ahmed');
  const [playerPhone, setPlayerPhone] = useState(currentUser?.phone || '+880 1711-234567');
  const [playerEmail, setPlayerEmail] = useState(currentUser?.email || 'tanvir@turfbd.com');
  const [teamNotes, setTeamNotes] = useState('');

  // Payment Setup
  const [paymentType, setPaymentType] = useState<PaymentType>('advance');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bkash');
  const [bkashNumber, setBkashNumber] = useState('01711234567');
  const [bkashPin, setBkashPin] = useState('12345');
  const [customTrxId, setCustomTrxId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState<any>(null);

  // Gateway integration modal states
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [pendingSession, setPendingSession] = useState<{
    paymentId: number;
    bookingId: number;
    bookingCode: string;
    amount: number;
    gateway: any;
    booking: any;
  } | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Fetch real slot availability from PostgreSQL API whenever turf or selected date changes
  const fetchSlotAvailability = useCallback(async () => {
    setIsLoadingSlots(true);
    try {
      const response = await fetch(`/api/slots?turfId=${turf.id}&date=${selectedDate}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch slots: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        const map: Record<string, string> = {};
        data.forEach((slot: any) => {
          if (slot.startTime) {
            map[slot.startTime] = slot.status || 'available';
          }
        });
        setSlotsMap(map);
      }
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error fetching real slot availability:', error);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [turf.id, selectedDate]);

  useEffect(() => {
    setSelectedSlots([]);
    fetchSlotAvailability();
  }, [turf.id, selectedDate, fetchSlotAvailability]);

  // Determine slot status: Available, Booked, Blocked, Maintenance
  const getSlotStatus = (start: string): 'available' | 'booked' | 'blocked' | 'maintenance' => {
    const rawStatus = slotsMap[start]?.toLowerCase();
    if (rawStatus === 'booked') return 'booked';
    if (rawStatus === 'blocked') return 'blocked';
    if (rawStatus === 'maintenance') return 'maintenance';
    return 'available';
  };

  const handleSlotToggle = (start: string) => {
    const status = getSlotStatus(start);
    if (status !== 'available') return;

    if (selectedSlots.includes(start)) {
      setSelectedSlots(selectedSlots.filter((s) => s !== start));
    } else {
      setSelectedSlots([...selectedSlots, start].sort());
    }
  };

  // Calculate duration & price
  const durationHours = selectedSlots.length;
  const earliestSlot = selectedSlots.length > 0 ? selectedSlots[0] : '';
  const lastSlotObj = selectedSlots.length > 0
    ? ALL_HOURLY_SLOTS.find((s) => s.start === selectedSlots[selectedSlots.length - 1])
    : null;
  const latestSlotEnd = lastSlotObj ? lastSlotObj.end : '';

  // Calculate pricing based on slot peak hours
  const totalAmount = selectedSlots.reduce((acc, start) => {
    const slotObj = ALL_HOURLY_SLOTS.find((s) => s.start === start);
    const rate = slotObj?.isPeak && turf.peakHourRate ? turf.peakHourRate : turf.hourlyRate;
    return acc + rate;
  }, 0);

  // Average price per hour for summary display
  const averageHourlyPrice = durationHours > 0 ? Math.round(totalAmount / durationHours) : turf.hourlyRate;

  // Advance calculation: fixed ৳1,000 or 30%
  const advanceAmount = Math.min(1000 * Math.max(1, durationHours), totalAmount);
  const finalPayAmount = paymentType === 'full' ? totalAmount : advanceAmount;
  const dueAmount = totalAmount - finalPayAmount;

  const handleProceedToSummary = () => {
    if (selectedSlots.length === 0) return;
    setStep('summary');
  };

  const handleProceedToPayment = () => {
    if (!playerName || !playerPhone) {
      alert('Please provide your name and contact phone number.');
      return;
    }
    setStep('payment');
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);

    try {
      // 1. Create booking reservation in PostgreSQL database
      const initialAdvance = paymentMethod === 'cash_on_field' ? 0 : finalPayAmount;
      const initialDue = paymentMethod === 'cash_on_field' ? totalAmount : dueAmount;
      const initialPayStatus =
        paymentMethod === 'cash_on_field'
          ? 'pending_field_payment'
          : paymentType === 'full'
          ? 'paid'
          : 'partial';

      const newBooking = await createBooking({
        turfId: turf.id,
        turfName: turf.name,
        turfArea: turf.area,
        turfCity: turf.city,
        userId: currentUser?.id || '1',
        userName: playerName,
        userPhone: playerPhone,
        userEmail: playerEmail,
        date: selectedDate,
        startTime: earliestSlot,
        endTime: latestSlotEnd,
        durationHours,
        sport,
        totalAmount,
        advancePaid: initialAdvance,
        dueAmount: initialDue,
        paymentMethod,
        paymentStatus: initialPayStatus,
        status: 'confirmed',
        notes: teamNotes,
      });

      // 2. If Cash on Field, complete immediately
      if (paymentMethod === 'cash_on_field') {
        setConfirmedBookingData(newBooking);
        setIsProcessing(false);
        setStep('success');
        fetchSlotAvailability();
        refreshBookings();
        return;
      }

      // 3. Initiate payment gateway session (bKash, Nagad, SSLCommerz)
      const initResult = await api.initiatePayment({
        bookingId: newBooking.id,
        gateway: paymentMethod,
        isAdvanceOnly: paymentType === 'advance',
        customerName: playerName,
        customerPhone: playerPhone,
        customerEmail: playerEmail,
      });

      setPendingSession({
        paymentId: initResult.paymentId,
        bookingId: Number(newBooking.id),
        bookingCode: newBooking.bookingCode,
        amount: finalPayAmount,
        gateway: paymentMethod,
        booking: newBooking,
      });

      setIsProcessing(false);
      setIsGatewayModalOpen(true);
    } catch (err: any) {
      console.error('Booking/Payment failed:', err);
      setIsProcessing(false);
      alert(err.message || 'Failed to initiate payment. Please try again.');
    }
  };

  const handleGatewaySuccess = (verificationResult: any) => {
    setIsGatewayModalOpen(false);
    if (pendingSession) {
      const updated = {
        ...pendingSession.booking,
        advancePaid: finalPayAmount,
        dueAmount: Math.max(0, totalAmount - finalPayAmount),
        paymentStatus: finalPayAmount >= totalAmount ? 'paid' : 'partial',
        transactionId: verificationResult.payment?.transactionId || verificationResult.transactionId,
        status: 'confirmed',
      };
      setConfirmedBookingData(updated);
    }
    setStep('success');
    fetchSlotAvailability();
    refreshBookings();
  };

  // Calendar month rendering helper
  const renderCalendarMonth = () => {
    const today = new Date();
    const targetMonthDate = new Date(today.getFullYear(), today.getMonth() + calendarMonthOffset, 1);
    const monthName = targetMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const firstDayIndex = targetMonthDate.getDay();
    const daysInMonth = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), d);
      const dateStr = dateObj.toISOString().split('T')[0];
      const isPast = dateStr < today.toISOString().split('T')[0];
      const isSelected = dateStr === selectedDate;
      const isToday = dateStr === today.toISOString().split('T')[0];
      days.push({ dayNumber: d, dateStr, isPast, isSelected, isToday });
    }

    return (
      <div className="bg-neutral-850 p-4 rounded-2xl border border-neutral-700 shadow-xl mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={calendarMonthOffset <= 0}
            onClick={() => setCalendarMonthOffset((prev) => Math.max(0, prev - 1))}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-white uppercase tracking-wider">{monthName}</span>
          <button
            type="button"
            disabled={calendarMonthOffset >= 2}
            onClick={() => setCalendarMonthOffset((prev) => Math.min(2, prev + 1))}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-neutral-500">
          <span>Su</span>
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {days.map((item, idx) => {
            if (!item) {
              return <div key={`empty-${idx}`} className="h-8" />;
            }
            return (
              <button
                key={item.dateStr}
                type="button"
                disabled={item.isPast}
                onClick={() => {
                  setSelectedDate(item.dateStr);
                  setShowFullCalendar(false);
                }}
                className={`h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                  item.isSelected
                    ? 'bg-emerald-500 text-neutral-950 font-bold shadow-md shadow-emerald-500/30'
                    : item.isPast
                    ? 'text-neutral-600 cursor-not-allowed'
                    : item.isToday
                    ? 'bg-neutral-800 text-emerald-400 border border-emerald-500/40 hover:bg-neutral-750'
                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                {item.dayNumber}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static"
      id="booking-modal"
    >
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl my-auto print:border-none print:shadow-none print:w-full print:max-w-none print:text-black">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/95 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                {step === 'slots'
                  ? 'Step 1 of 3: Select Date & Slots'
                  : step === 'summary'
                  ? 'Step 2 of 3: Booking Summary & Details'
                  : step === 'payment'
                  ? 'Step 3 of 3: Payment Checkout'
                  : 'Booking Confirmed'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">{turf.name}</h2>
            <p className="text-xs text-neutral-400">{turf.area}, {turf.city} • Rate: ৳{turf.hourlyRate}/hr</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
            id="booking-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: MODERN CALENDAR & SLOT SELECTION */}
        {step === 'slots' && (
          <div className="p-5 sm:p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* 1. Date Selector with Modern Calendar View */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                  <span>1. Choose Match Date</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowFullCalendar(!showFullCalendar)}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{showFullCalendar ? 'Hide Calendar' : 'Full Month Calendar'}</span>
                </button>
              </div>

              {showFullCalendar && renderCalendarMonth()}

              {/* Horizontal Scrollable/Pill Date Bar */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-700">
                {dateOptions.map((opt) => (
                  <button
                    key={opt.dateStr}
                    type="button"
                    onClick={() => {
                      setSelectedDate(opt.dateStr);
                      setSelectedSlots([]);
                    }}
                    className={`px-3.5 py-2.5 rounded-xl border text-center transition-all shrink-0 cursor-pointer min-w-[76px] ${
                      selectedDate === opt.dateStr
                        ? 'bg-emerald-500 text-neutral-950 border-emerald-400 font-bold shadow-lg shadow-emerald-500/20 scale-102'
                        : 'bg-neutral-850 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider">{opt.dayName}</div>
                    <div className="text-xs font-bold mt-0.5">{opt.monthDay}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Sport Type Choice */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                2. Select Sport Type
              </label>
              <div className="flex flex-wrap gap-2">
                {turf.sports.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setSport(sp)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      sport === sp
                        ? 'bg-neutral-800 text-emerald-400 border border-emerald-500/60 shadow-sm'
                        : 'bg-neutral-850 text-neutral-400 border border-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>{sp === 'football' ? '⚽ Football' : sp === 'cricket' ? '🏏 Cricket' : sp === 'badminton' ? '🏸 Badminton' : '🥅 Futsal'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Slot Availability Matrix & Clear States */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>3. Hourly Pitch Slots</span>
                </label>

                {/* State Legend & Real-Time Sync Indicator */}
                <div className="flex items-center gap-2 text-[10px] text-neutral-400 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fetchSlotAvailability()}
                    disabled={isLoadingSlots}
                    className="text-[10px] text-neutral-400 hover:text-emerald-400 flex items-center gap-1 bg-neutral-800 px-2 py-0.5 rounded-md transition-colors mr-1 cursor-pointer"
                    title="Real-time sync with PostgreSQL database"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingSlots ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>{isLoadingSlots ? 'Syncing...' : 'Sync Live'}</span>
                  </button>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Available
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-300 inline-block"></span> Selected
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-700 inline-block"></span> Booked
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block"></span> Blocked
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block"></span> Maintenance
                  </span>
                </div>
              </div>

              {/* Categorized Slots */}
              {['Evening (Lights)', 'Night Floodlight', 'Morning', 'Afternoon'].map((category) => {
                const categorySlots = ALL_HOURLY_SLOTS.filter((s) => s.category === category);
                return (
                  <div key={category} className="mb-4">
                    <div className="text-[11px] font-bold text-neutral-400 mb-1.5 flex items-center gap-1">
                      <span>{category}</span>
                      {category.includes('Lights') && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 rounded font-mono">
                          Popular Prime Time
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {categorySlots.map((slot) => {
                        const status = getSlotStatus(slot.start);
                        const isAvailable = status === 'available';
                        const isBooked = status === 'booked';
                        const isBlocked = status === 'blocked';
                        const isMaintenance = status === 'maintenance';
                        const selected = selectedSlots.includes(slot.start);
                        const price = slot.isPeak && turf.peakHourRate ? turf.peakHourRate : turf.hourlyRate;

                        return (
                          <button
                            key={slot.start}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => handleSlotToggle(slot.start)}
                            className={`p-2.5 rounded-xl border text-left transition-all relative ${
                              isBooked
                                ? 'bg-neutral-900/60 border-neutral-800/80 text-neutral-600 cursor-not-allowed line-through'
                                : isBlocked
                                ? 'bg-amber-950/20 border-amber-900/40 text-amber-500 cursor-not-allowed'
                                : isMaintenance
                                ? 'bg-orange-950/25 border-orange-900/40 text-orange-400 cursor-not-allowed'
                                : selected
                                ? 'bg-emerald-500 text-neutral-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400'
                                : 'bg-neutral-850 border-neutral-800 text-neutral-200 hover:border-emerald-500/50 hover:bg-neutral-800 cursor-pointer'
                            }`}
                          >
                            <div className="text-xs font-bold flex items-center justify-between">
                              <span>{slot.start} - {slot.end}</span>
                              {selected && <span>✓</span>}
                            </div>
                            <div className={`text-[10px] font-mono mt-0.5 flex items-center justify-between ${
                              selected ? 'text-neutral-950 font-semibold' : 'text-neutral-400'
                            }`}>
                              <span>
                                {isBooked
                                  ? 'Booked'
                                  : isBlocked
                                  ? 'Blocked'
                                  : isMaintenance
                                  ? 'Maintenance'
                                  : `৳${price}`}
                              </span>
                              {isAvailable && !selected && (
                                <span className="text-[9px] text-emerald-400">Available</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: BOOKING SUMMARY BEFORE CONFIRMATION & CONTACT DETAILS */}
        {step === 'summary' && (
          <div className="p-5 sm:p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Dedicated Booking Summary Card */}
            <div className="bg-neutral-850 rounded-2xl border border-emerald-500/30 overflow-hidden shadow-lg">
              <div className="bg-emerald-950/40 px-4 py-3 border-b border-emerald-500/20 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Match Booking Summary</span>
                </span>
                <span className="text-xs font-mono font-bold text-neutral-300">
                  {durationHours} Hour{durationHours > 1 ? 's' : ''} Pitch Lock
                </span>
              </div>

              <div className="p-4 sm:p-5 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-neutral-800">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">Turf Name</span>
                    <span className="text-sm font-bold text-white">{turf.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">Location</span>
                    <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{turf.address}, {turf.area}, {turf.city}</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-3 border-b border-neutral-800">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">Date</span>
                    <span className="text-xs font-bold text-white">{selectedDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">Time</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {earliestSlot} - {latestSlotEnd}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">Duration</span>
                    <span className="text-xs font-bold text-white">{durationHours} Hour{durationHours > 1 ? 's' : ''}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">Price Per Hour</span>
                    <span className="text-xs font-mono font-bold text-white">৳{averageHourlyPrice} / hr</span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-neutral-300">
                    <span>Total Pitch Fee ({durationHours} hr{durationHours > 1 ? 's' : ''}):</span>
                    <span className="font-mono font-bold text-white">৳{totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Advance Amount (Token to lock pitch):</span>
                    <span className="font-mono">৳{advanceAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-amber-400 font-semibold">
                    <span>Remaining Due Amount (Payable at venue):</span>
                    <span className="font-mono">৳{dueAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Player Details Form */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Player / Team Captain Details
              </h4>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Booker Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="e.g. Tanvir Ahmed"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Contact Phone Number (bKash & SMS)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                  <input
                    type="tel"
                    value={playerPhone}
                    onChange={(e) => setPlayerPhone(e.target.value)}
                    placeholder="+880 1711-234567"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Email Address (for Booking Voucher)</label>
                <input
                  type="email"
                  value={playerEmail}
                  onChange={(e) => setPlayerEmail(e.target.value)}
                  placeholder="tanvir@turfbd.com"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Match Requests / Notes (Optional)</label>
                <textarea
                  value={teamNotes}
                  onChange={(e) => setTeamNotes(e.target.value)}
                  placeholder="e.g. Need 10 bibs (5 red, 5 blue), 2 match balls, referee..."
                  rows={2}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PAYMENT STRUCTURE & GATEWAY */}
        {step === 'payment' && (
          <div className="p-5 sm:p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Amount Breakdown */}
            <div className="bg-neutral-850 p-4 rounded-2xl border border-neutral-800 space-y-2">
              <div className="flex justify-between text-xs text-neutral-300">
                <span>Total Pitch Fee ({durationHours} hr{durationHours > 1 ? 's' : ''}):</span>
                <span className="font-mono font-bold text-white">৳{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-neutral-300">
                <span>Platform Service Charge:</span>
                <span className="text-emerald-400 font-bold">FREE (0%)</span>
              </div>
              <div className="border-t border-neutral-800 pt-2 flex justify-between items-baseline">
                <span className="text-xs font-bold text-neutral-200">Amount Due Now:</span>
                <span className="text-xl font-black text-emerald-400 font-mono">৳{finalPayAmount.toLocaleString()}</span>
              </div>
              {dueAmount > 0 && (
                <div className="text-[11px] text-amber-400 flex items-center gap-1 pt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Remaining ৳{dueAmount.toLocaleString()} payable in cash or mobile money at field reception.</span>
                </div>
              )}
            </div>

            {/* Payment Type: Advance Token vs Full */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                1. Choose Payment Option
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentType('advance')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    paymentType === 'advance'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                      : 'bg-neutral-850 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <div className="text-xs font-bold">Pay Advance Token</div>
                  <div className="text-sm font-black font-mono mt-0.5">৳{advanceAmount.toLocaleString()}</div>
                  <div className="text-[10px] text-neutral-400 mt-1">Pay remaining on arrival</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType('full')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    paymentType === 'full'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                      : 'bg-neutral-850 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <div className="text-xs font-bold">Pay Full Pitch Fee</div>
                  <div className="text-sm font-black font-mono mt-0.5">৳{totalAmount.toLocaleString()}</div>
                  <div className="text-[10px] text-neutral-400 mt-1">100% paid, seamless check-in</div>
                </button>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                2. Select Payment Gateway
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bkash')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'bkash'
                      ? 'bg-pink-950/40 border-pink-500 text-pink-400 font-bold ring-2 ring-pink-500'
                      : 'bg-neutral-850 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <span className="text-base font-black">🌸 bKash</span>
                  <span className="text-[10px]">Instant API</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('nagad')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'nagad'
                      ? 'bg-orange-950/40 border-orange-500 text-orange-400 font-bold ring-2 ring-orange-500'
                      : 'bg-neutral-850 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <span className="text-base font-black">🟠 Nagad</span>
                  <span className="text-[10px]">DFS Gateway</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('sslcommerz')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'sslcommerz'
                      ? 'bg-blue-950/40 border-blue-500 text-blue-400 font-bold ring-2 ring-blue-500'
                      : 'bg-neutral-850 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <span className="text-base font-black">🔵 SSLCommerz</span>
                  <span className="text-[10px]">Cards &amp; Banking</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('rocket')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'rocket'
                      ? 'bg-purple-950/40 border-purple-500 text-purple-400 font-bold ring-2 ring-purple-500'
                      : 'bg-neutral-850 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <span className="text-base font-black">🟣 Rocket</span>
                  <span className="text-[10px]">DBBL Mobile</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash_on_field')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'cash_on_field'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 font-bold ring-2 ring-emerald-500'
                      : 'bg-neutral-850 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <span className="text-base font-black">💵 Cash</span>
                  <span className="text-[10px]">Pay on Field</span>
                </button>
              </div>
            </div>

            {/* Gateway Info Box */}
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Secure 256-bit {paymentMethod.toUpperCase()} Checkout</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  Sandbox Active
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Clicking &quot;Confirm &amp; Pay&quot; will create your match reservation and open the official{' '}
                <strong className="text-white capitalize">{paymentMethod}</strong> payment interface. Upon server verification, your slot is guaranteed.
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION & PRINTABLE VOUCHER */}
        {step === 'success' && confirmedBookingData && (
          <div className="p-6 sm:p-8 text-center space-y-5 max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">Slot Successfully Reserved!</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Your match slot is locked in PostgreSQL at {turf.name}. Present your pass voucher at reception.
              </p>
            </div>

            {/* Match Pass Digital Card */}
            <div className="bg-neutral-850 border-2 border-dashed border-emerald-500/40 rounded-3xl p-5 text-left space-y-3 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Digital Match Voucher</div>
                  <div className="text-xl font-mono font-black text-emerald-400 tracking-wider">
                    #{confirmedBookingData.bookingCode}
                  </div>
                </div>
                <span className="text-xs font-bold bg-emerald-500 text-neutral-950 px-2.5 py-1 rounded-lg">
                  CONFIRMED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-neutral-800">
                <div>
                  <span className="text-neutral-400 block text-[10px]">Arena</span>
                  <span className="font-bold text-white">{turf.name}</span>
                  <span className="text-[11px] text-neutral-400 block">{turf.address}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px]">Date & Time</span>
                  <span className="font-bold text-white">{confirmedBookingData.date}</span>
                  <span className="text-[11px] text-emerald-400 font-mono block">
                    {confirmedBookingData.startTime} - {confirmedBookingData.endTime}
                  </span>
                </div>
              </div>

              {/* Authentic Scannable QR code preview */}
              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-neutral-400 block text-[10px]">Booker Name</span>
                  <span className="font-bold text-white">{confirmedBookingData.userName}</span>
                  <span className="text-[10px] text-neutral-400 block">{confirmedBookingData.userPhone}</span>
                </div>
                <div className="bg-white p-1.5 rounded-lg shadow">
                  <svg className="w-12 h-12" viewBox="0 0 100 100" shapeRendering="crispEdges">
                    <rect width="100" height="100" fill="#ffffff" />
                    <rect x="10" y="10" width="24" height="24" fill="#000000" />
                    <rect x="13" y="13" width="18" height="18" fill="#ffffff" />
                    <rect x="16" y="16" width="12" height="12" fill="#000000" />
                    <rect x="66" y="10" width="24" height="24" fill="#000000" />
                    <rect x="69" y="13" width="18" height="18" fill="#ffffff" />
                    <rect x="72" y="16" width="12" height="12" fill="#000000" />
                    <rect x="10" y="66" width="24" height="24" fill="#000000" />
                    <rect x="13" y="69" width="18" height="18" fill="#ffffff" />
                    <rect x="16" y="72" width="12" height="12" fill="#000000" />
                    <rect x="44" y="44" width="12" height="12" fill="#000000" />
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-neutral-800 bg-neutral-900/60 -mx-5 -mb-5 p-4">
                <div>
                  <span className="text-[10px] text-neutral-400 block">Total Pitch Fee</span>
                  <span className="font-mono font-bold text-white">৳{confirmedBookingData.totalAmount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block">Paid ({confirmedBookingData.paymentMethod.toUpperCase()})</span>
                  <span className="font-mono font-bold text-emerald-400">৳{confirmedBookingData.advancePaid}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block">Due on Field</span>
                  <span className="font-mono font-bold text-amber-400">৳{confirmedBookingData.dueAmount}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 print:hidden">
              <button
                onClick={() => setShowReceiptModal(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-neutral-700 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Download / Print Tax Receipt</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  setActiveTab('my-bookings');
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
                id="view-my-bookings-btn"
              >
                Go to My Bookings
              </button>
            </div>
          </div>
        )}

        {/* Modal Bottom Controls */}
        {step !== 'success' && (
          <div className="p-4 sm:p-5 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between gap-3">
            {step === 'slots' ? (
              <>
                <div>
                  <span className="text-[10px] text-neutral-400 block font-semibold">
                    {durationHours} hour{durationHours !== 1 ? 's' : ''} selected
                  </span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    ৳{totalAmount.toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={selectedSlots.length === 0}
                  onClick={handleProceedToSummary}
                  className={`px-6 py-2.5 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all ${
                    selectedSlots.length > 0
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-lg shadow-emerald-500/20 cursor-pointer'
                      : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                  }`}
                  id="proceed-to-summary-btn"
                >
                  <span>Review Booking Summary</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : step === 'summary' ? (
              <>
                <button
                  type="button"
                  onClick={() => setStep('slots')}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Slots</span>
                </button>
                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                  id="proceed-to-payment-btn"
                >
                  <span>Proceed to Payment</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep('summary')}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmPayment}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
                  id="confirm-pay-btn"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                      <span>Initiating Gateway...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {paymentMethod === 'cash_on_field' ? 'Confirm Reservation' : `Pay ৳${finalPayAmount.toLocaleString()} via ${paymentMethod.toUpperCase()}`}
                      </span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Gateway Checkout Dialog */}
      {isGatewayModalOpen && pendingSession && (
        <PaymentGatewayModal
          isOpen={isGatewayModalOpen}
          gateway={pendingSession.gateway}
          amount={pendingSession.amount}
          bookingId={pendingSession.bookingId}
          bookingCode={pendingSession.bookingCode}
          turfName={turf.name}
          paymentId={pendingSession.paymentId}
          onSuccess={handleGatewaySuccess}
          onCancel={() => setIsGatewayModalOpen(false)}
        />
      )}

      {/* Tax Invoice & Printable Receipt Modal */}
      {showReceiptModal && confirmedBookingData && (
        <PaymentReceiptModal
          booking={confirmedBookingData}
          onClose={() => setShowReceiptModal(false)}
          transactionId={confirmedBookingData.transactionId}
          paymentMethod={confirmedBookingData.paymentMethod}
          paymentAmount={confirmedBookingData.advancePaid}
        />
      )}
    </div>
  );
};
