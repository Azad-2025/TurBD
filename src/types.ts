export type UserRole = 'customer' | 'player' | 'owner' | 'admin';
export type OwnerVerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  location?: string;
  favoriteTurfs?: number[];
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  googleId?: string;
  facebookId?: string;
  // Phase 8: Owner verification fields
  ownerVerificationStatus?: OwnerVerificationStatus;
  ownerSubmittedAt?: string | null;
  ownerReviewedAt?: string | null;
  ownerReviewedBy?: number | null;
  ownerApprovedAt?: string | null;
  ownerApprovedBy?: number | null;
  ownerRejectedAt?: string | null;
  ownerRejectedBy?: number | null;
  ownerRejectionReason?: string | null;
  ownerSuspendedAt?: string | null;
  ownerSuspendedBy?: number | null;
  ownerSuspensionReason?: string | null;
  ownerDocuments?: { type: string; url: string; name: string }[];
  isSuperAdmin?: boolean;
  createdAt: string;
}

export type SportType = 'football' | 'cricket' | 'badminton' | 'futsal';
export type VenueType = 'all' | 'indoor' | 'outdoor' | 'rooftop' | 'covered';
export type VerifiedBadgeTier = 'standard' | 'turfbd_verified' | 'gold_partner';

export interface TurfAmenity {
  id: string;
  name: string;
  icon?: string;
}

export interface TurfDocument {
  id?: number;
  type: string;
  url: string;
  name: string;
  uploadedAt?: string;
}

export interface TurfPricingRule {
  name: string;
  startTime: string; // '06:00'
  endTime: string;   // '18:00'
  pricePerHour: number;
  type: 'default' | 'off_peak' | 'peak';
  daysOfWeek?: number[];
}

export interface Turf {
  id: string;
  name: string;
  tagline: string;
  description: string;
  city: string; // e.g., Dhaka, Chattogram, Sylhet
  area: string; // e.g., Dhanmondi, Gulshan, Mirpur, Uttara, Bashundhara
  address: string;
  sports: SportType[];
  size: string; // e.g., "7 vs 7 (Full)", "5 vs 5 (Indoor Cage)", "Box Cricket Standard"
  surface: string; // e.g., "FIFA 2-Star Artificial Grass", "Synthetic Turf"
  hourlyRate: number; // in BDT (standard/default rate)
  dayPricePerHour?: number; // Morning/Day price (e.g. 06:00-18:00)
  nightPricePerHour?: number; // Night/Floodlight price (e.g. 18:00-02:00)
  peakHourRate?: number; // peak floodlight rate
  pricingRules?: TurfPricingRule[];
  images: string[];
  mainImage?: string;
  facilityImages?: string[];
  videoThumbnail?: string;
  documents?: TurfDocument[];
  amenities: string[]; // ['Floodlights', 'Changing Room', 'Shower', 'Bibs & Balls', 'Parking', 'Cafeteria', 'First Aid']
  status: 'approved' | 'pending' | 'rejected' | 'suspended';
  rejectionReason?: string | null;
  suspensionReason?: string | null;
  reviewedBy?: number | null;
  reviewedAt?: string | null;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  rating: number;
  reviewCount: number;
  openingTime: string; // e.g., "06:00"
  closingTime: string; // e.g., "02:00"
  isFeatured?: boolean;
  latitude: number;
  longitude: number;
  venueType: 'indoor' | 'outdoor' | 'rooftop' | 'covered';
  verifiedBadge: VerifiedBadgeTier;
  distanceKm?: number;
  distanceFormatted?: string;
  driveTimeMinutes?: number;
  availableSlotsCount?: number;
}

export type SlotStatus = 'available' | 'booked' | 'blocked' | 'maintenance' | 'selected' | 'held';

export interface Slot {
  id: string;
  turfId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "18:00"
  endTime: string; // "19:00"
  price: number;
  status: SlotStatus;
  reason?: string;
  blockedBy?: number | null;
  blockedAt?: string | null;
  ruleName?: string;
}

export type PaymentMethod = 'bkash' | 'nagad' | 'sslcommerz' | 'rocket' | 'cash_on_field';
export type PaymentType = 'full' | 'advance';
export type PaymentStatus =
  | 'pending'
  | 'initiated'
  | 'successful'
  | 'paid'
  | 'partial'
  | 'partially_paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'pending_field_payment';
export type BookingStatus = 'confirmed' | 'pending_approval' | 'cancelled' | 'cancellation_requested' | 'completed';

export interface PaymentTransaction {
  id: string | number;
  bookingId: string | number;
  bookingCode?: string;
  turfId?: string | number;
  turfName?: string;
  userId?: string | number;
  userName?: string;
  userPhone?: string;
  method: PaymentMethod;
  transactionId: string;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export interface Booking {
  id: string;
  bookingCode: string; // e.g. TBD-7492
  turfId: string;
  turfName: string;
  turfArea: string;
  turfCity: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  durationHours: number;
  sport: SportType;
  totalAmount: number; // in BDT
  advancePaid: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  status: BookingStatus;
  createdAt: string;
  notes?: string;
  cancellationReason?: string;
  refundStatus?: 'none' | 'pending' | 'approved' | 'refunded' | 'rejected';
  refundAmount?: number;
  isCheckedIn?: boolean;
  checkedInAt?: string | null;
  checkedInBy?: number | null;
  checkedInByName?: string | null;
  qrData?: string;
}

export interface Review {
  id: string;
  turfId: string;
  userId: string;
  userName: string;
  userRole?: string;
  rating: number; // 1 to 5
  comment: string;
  date: string;
  verifiedBooking: boolean;
  ownerReply?: {
    comment: string;
    date: string;
  };
}

export interface SearchFilters {
  query: string;
  city: string;
  area: string;
  sport: string;
  date: string;
  timeSlot: string; // 'all' | 'morning' | 'afternoon' | 'evening' | 'night' or specific 'HH:MM'
  venueType: string; // 'all' | 'indoor' | 'outdoor' | 'rooftop'
  verifiedOnly: boolean;
  badge: string; // 'all' | 'gold_partner' | 'turfbd_verified'
  maxDistanceKm: number; // e.g. 5, 10, 25, 50, 100
  sortBy: 'recommended' | 'distance' | 'price_asc' | 'price_desc' | 'rating';
  maxPrice: number;
  amenity: string;
  userLocation: {
    latitude: number;
    longitude: number;
    name?: string;
    isDetected?: boolean;
  } | null;
  viewMode: 'split' | 'map' | 'grid';
}

export type ActiveTab = 'home' | 'explore' | 'bookings' | 'profile' | 'owner' | 'admin' | 'browse' | 'notifications';

export type NotificationType =
  | 'booking_confirmed'
  | 'payment_success'
  | 'payment_failed'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'checkin_completed'
  | 'refund_status_changed'
  | 'refund_completed'
  | 'match_reminder'
  | 'owner_new_booking'
  | 'owner_advance_paid'
  | 'owner_cancellation'
  | 'owner_refund_request'
  | 'owner_verification_status'
  | 'payout_approved'
  | 'payout_rejected'
  | 'payout_dispatched'
  | 'admin_turf_registered'
  | 'admin_payment_issue'
  | 'admin_refund_request'
  | 'admin_dispute';

export interface AppNotification {
  id: number;
  userId?: number | null;
  recipientRole: 'customer' | 'owner' | 'admin' | 'all';
  type: NotificationType | string;
  title: string;
  message: string;
  bookingId?: number | null;
  turfId?: number | null;
  metadata?: {
    bookingCode?: string;
    turfName?: string;
    date?: string;
    timeSlot?: string;
    paymentStatus?: string;
    tokenPaid?: number;
    remainingDue?: number;
    location?: string;
    amount?: number;
    gateway?: string;
    transactionId?: string;
    reason?: string;
    customerName?: string;
    customerPhone?: string;
    brandLogo?: string;
    [key: string]: any;
  };
  isRead: boolean;
  createdAt: string;
}

export type PayoutStatus = 'pending' | 'approved' | 'dispatched' | 'rejected';

export interface PayoutRequest {
  id: number;
  ownerId: number;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  amount: number;
  method: 'bkash' | 'nagad' | 'bank_transfer' | 'rocket';
  accountNumber: string;
  accountDetails?: {
    bankName?: string;
    branchName?: string;
    routingNumber?: string;
    accountTitle?: string;
  };
  status: PayoutStatus;
  requestedAt: string;
  reviewedAt?: string | null;
  processedAt?: string | null;
  requestedBy: number;
  reviewedBy?: number | null;
  processedBy?: number | null;
  rejectionReason?: string | null;
  transactionReference?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  userId?: number | null;
  userName?: string;
  userEmail?: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: any;
  ipAddress?: string | null;
  createdAt: string;
}

export interface Dispute {
  id: number;
  bookingId: number;
  bookingCode?: string;
  userId: number;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  turfId: number;
  turfName?: string;
  reason: 'venue_closed' | 'double_booked' | 'condition_unplayable' | 'wrong_charge' | 'other' | string;
  description: string;
  requestedAmount: number;
  status: 'open' | 'under_review' | 'resolved_refunded' | 'rejected';
  adminNotes?: string | null;
  resolvedBy?: number | null;
  resolvedAt?: string | null;
  refundId?: number | null;
  createdAt: string;
}



