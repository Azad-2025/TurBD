export type UserRole = 'player' | 'owner' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  googleId?: string;
  facebookId?: string;
  createdAt: string;
}

export type SportType = 'football' | 'cricket' | 'badminton' | 'futsal';

export interface TurfAmenity {
  id: string;
  name: string;
  icon?: string;
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
  hourlyRate: number; // in BDT (৳)
  peakHourRate?: number; // e.g., for evening/night floodlights
  images: string[];
  mainImage?: string;
  facilityImages?: string[];
  videoThumbnail?: string;
  documents?: TurfDocument[];
  amenities: string[]; // ['Floodlights', 'Changing Room', 'Shower', 'Bibs & Balls', 'Parking', 'Cafeteria', 'First Aid']
  status: 'approved' | 'pending' | 'rejected';
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  rating: number;
  reviewCount: number;
  openingTime: string; // e.g., "06:00"
  closingTime: string; // e.g., "02:00"
  isFeatured?: boolean;
}

export type SlotStatus = 'available' | 'booked' | 'maintenance' | 'selected';

export interface Slot {
  id: string;
  turfId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "18:00"
  endTime: string; // "19:00"
  price: number;
  status: SlotStatus;
}

export type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'cash_on_field';
export type PaymentType = 'full' | 'advance';
export type PaymentStatus = 'paid' | 'partial' | 'pending_field_payment';
export type BookingStatus = 'confirmed' | 'pending_approval' | 'cancelled' | 'completed';

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
  totalAmount: number; // in BDT ৳
  advancePaid: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  status: BookingStatus;
  createdAt: string;
  notes?: string;
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
  maxPrice: number;
  amenity: string;
}
