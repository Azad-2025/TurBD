import { Turf, Booking, Review, User, UserRole, SportType, AppNotification } from '../types';

const API_BASE = '/api';

let authToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('turfbd_auth_token') : null;
let refreshToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('turfbd_refresh_token') : null;

function getAuthHeaders(contentType: boolean = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

function mapUser(u: any): User {
  return {
    id: String(u.id),
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: (u.role === 'player' ? 'customer' : u.role) as UserRole,
    avatar: u.profileImage || undefined,
    location: u.location || 'Dhaka, Bangladesh',
    favoriteTurfs: Array.isArray(u.favoriteTurfs) ? u.favoriteTurfs : [],
    isEmailVerified: Boolean(u.isEmailVerified || u.is_email_verified || u.role === 'super_admin'),
    isPhoneVerified: Boolean(u.isPhoneVerified || u.is_phone_verified || u.role === 'super_admin'),
    isVerified: Boolean(u.isVerified || u.is_verified || u.role === 'super_admin'),
    googleId: u.googleId,
    facebookId: u.facebookId,
    isSuperAdmin: Boolean(u.isSuperAdmin || u.is_super_admin || u.role === 'super_admin'),
    ownerVerificationStatus: u.ownerVerificationStatus || 'pending',
    ownerSubmittedAt: u.ownerSubmittedAt ? String(u.ownerSubmittedAt) : null,
    ownerReviewedAt: u.ownerReviewedAt ? String(u.ownerReviewedAt) : null,
    ownerReviewedBy: u.ownerReviewedBy ?? null,
    ownerApprovedAt: u.ownerApprovedAt ? String(u.ownerApprovedAt) : null,
    ownerApprovedBy: u.ownerApprovedBy ?? null,
    ownerRejectedAt: u.ownerRejectedAt ? String(u.ownerRejectedAt) : null,
    ownerRejectedBy: u.ownerRejectedBy ?? null,
    ownerRejectionReason: u.ownerRejectionReason || null,
    ownerSuspendedAt: u.ownerSuspendedAt ? String(u.ownerSuspendedAt) : null,
    ownerSuspendedBy: u.ownerSuspendedBy ?? null,
    ownerSuspensionReason: u.ownerSuspensionReason || null,
    ownerDocuments: Array.isArray(u.ownerDocuments) ? u.ownerDocuments : [],
    createdAt: u.createdAt ? String(u.createdAt) : new Date().toISOString(),
  };
}

export const api = {
  setToken(token: string | null, refresh?: string | null) {
    authToken = token;
    if (refresh !== undefined) {
      refreshToken = refresh;
    }
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('turfbd_auth_token', token);
      } else {
        localStorage.removeItem('turfbd_auth_token');
      }
      if (refresh) {
        localStorage.setItem('turfbd_refresh_token', refresh);
      } else if (refresh === null) {
        localStorage.removeItem('turfbd_refresh_token');
      }
    }
  },

  getToken(): string | null {
    return authToken;
  },

  getRefreshToken(): string | null {
    return refreshToken;
  },

  async refreshToken(): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        api.setToken(null, null);
        return null;
      }
      const data = await res.json();
      if (data.token) {
        api.setToken(data.token, data.refreshToken || null);
        return data.token;
      }
      return null;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ refreshToken }),
      });
    } finally {
      api.setToken(null, null);
    }
  },

  // Phone OTP
  async sendOtp(phone: string): Promise<{ success: boolean; message: string; phone: string; demoCode?: string }> {
    const res = await fetch(`${API_BASE}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to send OTP');
    }
    return json;
  },

  async verifyOtp(phone: string, code: string, name?: string, role?: string): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, name, role }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to verify OTP');
    }
    if (json.token) {
      api.setToken(json.token, json.refreshToken || null);
    }
    return { user: mapUser(json.user), token: json.token };
  },

  // Email & Password Reset
  async forgotPassword(email: string): Promise<{ success: boolean; message: string; resetToken?: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to send password reset instructions');
    }
    return json;
  },

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to reset password');
    }
    return json;
  },

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to verify email');
    }
    return json;
  },

  async resendEmailVerification(email?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/verify-email/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to send verification email');
    }
    return json;
  },

  // Social OAuth
  async getGoogleAuthUrl(): Promise<{ url?: string; configured: boolean; redirectUri: string; error?: string; setupInstructions?: string; enabled?: boolean; code?: string }> {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const query = origin ? `?origin=${encodeURIComponent(origin)}` : '';
    const res = await fetch(`${API_BASE}/auth/google/url${query}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Google Login is currently disabled.');
    }
    return data;
  },

  async getFacebookAuthUrl(): Promise<{ url?: string; configured: boolean; redirectUri: string; error?: string; setupInstructions?: string; enabled?: boolean; code?: string }> {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const query = origin ? `?origin=${encodeURIComponent(origin)}` : '';
    const res = await fetch(`${API_BASE}/auth/facebook/url${query}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Facebook Login is currently disabled.');
    }
    return data;
  },

  async getAuthProviders(): Promise<{
    google: { enabled: boolean; configured: boolean };
    facebook: { enabled: boolean; configured: boolean };
    emailPassword: { enabled: boolean };
    phoneOtp: { enabled: boolean };
  }> {
    const res = await fetch(`${API_BASE}/auth/providers`);
    if (!res.ok) throw new Error('Failed to retrieve authentication provider status');
    return res.json();
  },

  // Auth & Users
  async register(data: { name: string; phone: string; email: string; password?: string; role?: string }): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to register');
    }
    const json = await res.json();
    if (json.token) {
      api.setToken(json.token, json.refreshToken || null);
    }
    return mapUser(json.user);
  },

  async login(email: string, password?: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid credentials');
    }
    const json = await res.json();
    if (json.token) {
      api.setToken(json.token, json.refreshToken || null);
    }
    return mapUser(json.user);
  },

  async getMe(): Promise<User | null> {
    if (!authToken) return null;
    try {
      let res = await fetch(`${API_BASE}/auth/me`, {
        headers: getAuthHeaders(false),
      });
      // Handle token expiration
      if (res.status === 401) {
        const errJson = await res.clone().json().catch(() => ({}));
        if (errJson?.code === 'TOKEN_EXPIRED') {
          const newToken = await api.refreshToken();
          if (newToken) {
            res = await fetch(`${API_BASE}/auth/me`, {
              headers: getAuthHeaders(false),
            });
          }
        }
      }
      if (!res.ok) return null;
      const { user } = await res.json();
      return mapUser(user);
    } catch {
      return null;
    }
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/auth/users`, {
      headers: getAuthHeaders(false),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((u: any) => mapUser(u));
  },

  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId: Number(userId), role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update user role');
    }
  },

  // User Profile & Account Management
  async getProfile(): Promise<{ user: User; stats: { totalBookings: number; confirmedMatches: number; upcomingMatches: number; totalSpent: number } }> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      headers: getAuthHeaders(false),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch user profile');
    }
    const data = await res.json();
    return {
      user: mapUser(data.user),
      stats: data.stats,
    };
  },

  async updateProfile(updates: { name?: string; phone?: string; location?: string; profileImage?: string | null }): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update profile');
    }
    const data = await res.json();
    return mapUser(data.user);
  },

  async uploadAvatar(file: File): Promise<{ profileImage: string; user: any }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`${API_BASE}/uploads/avatar`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload profile picture');
    }

    return await res.json();
  },

  async deleteAvatar(): Promise<void> {
    const res = await fetch(`${API_BASE}/uploads/avatar`, {
      method: 'DELETE',
      headers: getAuthHeaders(false),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to remove profile picture');
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<string> {
    const res = await fetch(`${API_BASE}/auth/profile/password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to change password');
    }
    return data.message || 'Password changed successfully.';
  },

  async toggleFavoriteTurf(turfId: string | number): Promise<{ isFavorite: boolean; favoriteTurfs: number[] }> {
    const res = await fetch(`${API_BASE}/auth/profile/favorites/${turfId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to toggle favorite turf');
    }
    return data;
  },

  async getFavoriteTurfs(): Promise<Turf[]> {
    const res = await fetch(`${API_BASE}/auth/profile/favorites`, {
      headers: getAuthHeaders(false),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((t: any) => ({
      id: String(t.id),
      name: t.name,
      description: t.description || '',
      images: Array.isArray(t.images) ? t.images : [],
      location: {
        address: t.address || '',
        city: t.city || 'Dhaka',
        area: t.area || '',
        coordinates: { lat: t.lat || 23.8103, lng: t.lng || 90.4125 },
      },
      sports: Array.isArray(t.sports) ? t.sports : ['football'],
      amenities: Array.isArray(t.amenities) ? t.amenities : [],
      pricing: {
        hourlyRate: t.hourlyRate || 1500,
        advancePercentage: t.advancePercentage || 25,
        currency: 'BDT',
      },
      rating: {
        average: t.rating || 4.8,
        count: t.reviewCount || 10,
      },
      ownerId: String(t.ownerId || '1'),
      status: t.status || 'approved',
      availableHours: {
        open: t.openTime || '06:00',
        close: t.closeTime || '23:59',
      },
      slots: [],
      rules: Array.isArray(t.rules) ? t.rules : [],
    }));
  },

  async sendPhoneVerification(phone?: string): Promise<{ success: boolean; message: string; demoCode?: string }> {
    const res = await fetch(`${API_BASE}/auth/verify-phone/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ phone }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send phone verification code');
    }
    return data;
  },

  async confirmPhoneVerification(phone: string, code: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/verify-phone/confirm`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to verify phone number');
    }
    return mapUser(data.user);
  },

  // Turfs & Discovery
  async getTurfs(params?: {
    city?: string;
    area?: string;
    sport?: string;
    venueType?: string;
    verifiedOnly?: boolean;
    badge?: string;
    maxPrice?: number;
    query?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    sortBy?: string;
    date?: string;
    timeSlot?: string;
    availableOnly?: boolean;
  }): Promise<Turf[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.city && params.city !== 'All Cities') searchParams.append('city', params.city);
      if (params.area && params.area !== 'All Areas') searchParams.append('area', params.area);
      if (params.sport && params.sport !== 'all') searchParams.append('sport', params.sport);
      if (params.venueType && params.venueType !== 'all') searchParams.append('venueType', params.venueType);
      if (params.verifiedOnly) searchParams.append('verifiedOnly', 'true');
      if (params.badge && params.badge !== 'all') searchParams.append('badge', params.badge);
      if (params.maxPrice) searchParams.append('maxPrice', String(params.maxPrice));
      if (params.query) searchParams.append('query', params.query);
      if (params.lat !== undefined && params.lng !== undefined) {
        searchParams.append('lat', String(params.lat));
        searchParams.append('lng', String(params.lng));
      }
      if (params.radius) searchParams.append('radius', String(params.radius));
      if (params.sortBy) searchParams.append('sortBy', params.sortBy);
      if (params.date) searchParams.append('date', params.date);
      if (params.timeSlot && params.timeSlot !== 'all') searchParams.append('timeSlot', params.timeSlot);
      if (params.availableOnly) searchParams.append('availableOnly', 'true');
    }

    const queryStr = searchParams.toString();
    const url = queryStr ? `${API_BASE}/turfs?${queryStr}` : `${API_BASE}/turfs`;
    const res = await fetch(url, {
      headers: getAuthHeaders(false),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((t: any) => ({
      id: String(t.id),
      name: t.turfName || t.name,
      tagline: t.tagline || `Premier arena in ${t.address}`,
      description: t.description || `Modern sports facility with high-density grass, bright floodlights, and clean amenities in ${t.city}.`,
      city: t.city,
      area: t.area || t.address?.split(',')[0] || t.city,
      address: t.address,
      sports: Array.isArray(t.sportType) ? t.sportType : Array.isArray(t.sports) ? t.sports : ['football'],
      size: t.size || '7 vs 7 & Box Cricket',
      surface: t.surfaceType || t.surface || '50mm FIFA Quality Pro Turf',
      hourlyRate: Number(t.pricePerHour || t.hourlyRate || 1500),
      peakHourRate: Number(t.peakHourRate || Math.round((t.pricePerHour || t.hourlyRate || 1500) * 1.15)),
      images: Array.isArray(t.images) && t.images.length > 0 ? t.images : ['https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80'],
      amenities: Array.isArray(t.amenities) && t.amenities.length > 0 ? t.amenities : ['Floodlights', 'Locker Room', 'Shower', 'Bibs & Match Balls', 'Reserved Parking'],
      status: t.verificationStatus || t.status || 'approved',
      verificationStatus: t.verificationStatus || t.status || 'approved',
      rejectionReason: t.rejectionReason,
      suspensionReason: t.suspensionReason,
      ownerId: String(t.ownerId),
      ownerName: t.ownerName || 'Turf Owner',
      ownerPhone: t.ownerPhone || '+880 1819-876543',
      rating: typeof t.rating === 'number' ? t.rating : 4.8,
      reviewCount: typeof t.reviewCount === 'number' ? t.reviewCount : 18,
      openingTime: t.openingTime || '06:00',
      closingTime: t.closingTime || '02:00',
      isFeatured: Boolean(t.isFeatured),
      isDemo: Boolean(t.isDemo),
      isVerified: Boolean(t.isVerified !== undefined ? t.isVerified : t.verificationStatus === 'approved'),
      latitude: Number(t.latitude || 23.8103),
      longitude: Number(t.longitude || 90.4125),
      venueType: (t.venueType || 'outdoor') as any,
      verifiedBadge: (t.verifiedBadge || (t.verificationStatus === 'approved' ? 'turfbd_verified' : 'standard')) as any,
      distanceKm: t.distanceKm !== undefined ? Number(t.distanceKm) : undefined,
      distanceFormatted: t.distanceFormatted,
      driveTimeMinutes: t.driveTimeMinutes,
    }));
  },

  async getOwnerTurfs(ownerId?: string | number): Promise<Turf[]> {
    const searchParams = new URLSearchParams({ scope: 'owner' });
    if (ownerId) searchParams.append('ownerId', String(ownerId));
    const url = `${API_BASE}/turfs?${searchParams.toString()}`;
    const res = await fetch(url, {
      headers: getAuthHeaders(false),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((t: any) => ({
      id: String(t.id),
      name: t.turfName || t.name,
      tagline: t.tagline || `Premier arena in ${t.address}`,
      description: t.description || `Modern sports facility with high-density grass, bright floodlights, and clean amenities in ${t.city}.`,
      city: t.city,
      area: t.area || t.address?.split(',')[0] || t.city,
      address: t.address,
      sports: Array.isArray(t.sportType) ? t.sportType : ['football'],
      size: t.size || '7 vs 7 & Box Cricket',
      surface: t.surfaceType || '50mm FIFA Quality Pro Turf',
      hourlyRate: Number(t.pricePerHour || 1500),
      peakHourRate: Number(t.peakHourRate || Math.round((t.pricePerHour || 1500) * 1.15)),
      images: Array.isArray(t.images) && t.images.length > 0 ? t.images : ['https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80'],
      amenities: Array.isArray(t.amenities) && t.amenities.length > 0 ? t.amenities : ['Floodlights', 'Locker Room'],
      status: t.verificationStatus || t.status || 'pending',
      verificationStatus: t.verificationStatus || t.status || 'pending',
      rejectionReason: t.rejectionReason,
      suspensionReason: t.suspensionReason,
      ownerId: String(t.ownerId),
      ownerName: t.ownerName || 'Turf Owner',
      ownerPhone: t.ownerPhone || '+880 1819-876543',
      rating: typeof t.rating === 'number' ? t.rating : 4.8,
      reviewCount: typeof t.reviewCount === 'number' ? t.reviewCount : 0,
      openingTime: t.openingTime || '06:00',
      closingTime: t.closingTime || '02:00',
      isFeatured: Boolean(t.isFeatured),
      latitude: Number(t.latitude || 23.8103),
      longitude: Number(t.longitude || 90.4125),
      venueType: (t.venueType || 'outdoor') as any,
      verifiedBadge: (t.verifiedBadge || 'standard') as any,
    }));
  },

  async getNearbyTurfs(lat: number, lng: number, radius = 25, sport?: string, venueType?: string): Promise<Turf[]> {
    const searchParams = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radius: String(radius),
    });
    if (sport && sport !== 'all') searchParams.append('sport', sport);
    if (venueType && venueType !== 'all') searchParams.append('venueType', venueType);

    const res = await fetch(`${API_BASE}/turfs/nearby?${searchParams.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((t: any) => ({
      id: String(t.id),
      name: t.turfName || t.name,
      tagline: t.tagline || `Premier arena in ${t.address}`,
      description: t.description || `Modern sports facility with high-density grass, bright floodlights, and clean amenities in ${t.city}.`,
      city: t.city,
      area: t.area || t.address?.split(',')[0] || t.city,
      address: t.address,
      sports: Array.isArray(t.sportType) ? t.sportType : Array.isArray(t.sports) ? t.sports : ['football'],
      size: t.size || '7 vs 7 & Box Cricket',
      surface: t.surfaceType || t.surface || '50mm FIFA Quality Pro Turf',
      hourlyRate: Number(t.pricePerHour || t.hourlyRate || 1500),
      peakHourRate: Number(t.peakHourRate || Math.round((t.pricePerHour || t.hourlyRate || 1500) * 1.15)),
      images: Array.isArray(t.images) && t.images.length > 0 ? t.images : ['https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80'],
      amenities: Array.isArray(t.amenities) && t.amenities.length > 0 ? t.amenities : ['Floodlights', 'Locker Room', 'Shower', 'Bibs & Match Balls', 'Reserved Parking'],
      status: t.verificationStatus || t.status || 'approved',
      ownerId: String(t.ownerId),
      ownerName: t.ownerName || 'Turf Owner',
      ownerPhone: t.ownerPhone || '+880 1819-876543',
      rating: typeof t.rating === 'number' ? t.rating : 4.8,
      reviewCount: typeof t.reviewCount === 'number' ? t.reviewCount : 18,
      openingTime: t.openingTime || '06:00',
      closingTime: t.closingTime || '02:00',
      isFeatured: Boolean(t.isFeatured),
      latitude: Number(t.latitude || 23.8103),
      longitude: Number(t.longitude || 90.4125),
      venueType: (t.venueType || 'outdoor') as any,
      verifiedBadge: (t.verifiedBadge || 'turfbd_verified') as any,
      distanceKm: t.distanceKm !== undefined ? Number(t.distanceKm) : undefined,
      distanceFormatted: t.distanceFormatted,
      driveTimeMinutes: t.driveTimeMinutes,
    }));
  },

  async createTurf(turf: Partial<Turf>): Promise<Turf> {
    const res = await fetch(`${API_BASE}/turfs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ownerId: turf.ownerId ? Number(turf.ownerId) : undefined,
        turfName: turf.name,
        address: turf.address,
        city: turf.city,
        images: turf.images,
        sportType: turf.sports,
        surfaceType: turf.surface,
        pricePerHour: turf.hourlyRate,
        openingTime: turf.openingTime || '06:00',
        closingTime: turf.closingTime || '02:00',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create turf');
    }
    const t = await res.json();
    return {
      id: String(t.id),
      name: t.turfName,
      tagline: `Premier arena in ${t.address}`,
      description: turf.description || '',
      city: t.city,
      area: turf.area || t.city,
      address: t.address,
      sports: t.sportType || ['football'],
      size: turf.size || '7 vs 7',
      surface: t.surfaceType,
      hourlyRate: t.pricePerHour,
      peakHourRate: turf.peakHourRate || t.pricePerHour,
      images: t.images,
      amenities: turf.amenities || ['Floodlights', 'Locker Room'],
      status: t.verificationStatus,
      ownerId: String(t.ownerId),
      ownerName: turf.ownerName || 'Turf Owner',
      ownerPhone: turf.ownerPhone || '+880 1819-876543',
      rating: 5.0,
      reviewCount: 0,
      openingTime: t.openingTime,
      closingTime: t.closingTime,
      isFeatured: false,
      latitude: turf.latitude || (t.latitude ? Number(t.latitude) : 23.8103),
      longitude: turf.longitude || (t.longitude ? Number(t.longitude) : 90.4125),
      venueType: turf.venueType || (t.venueType as any) || 'outdoor',
      verifiedBadge: turf.verifiedBadge || (t.verifiedBadge as any) || 'none',
    };
  },

  async updateTurf(turfId: string, updates: Partial<Turf>): Promise<void> {
    const payload: any = {};
    if (updates.hourlyRate !== undefined) payload.pricePerHour = updates.hourlyRate;
    if (updates.name !== undefined) payload.turfName = updates.name;
    if (updates.status !== undefined) payload.verificationStatus = updates.status;

    const res = await fetch(`${API_BASE}/turfs/${turfId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update turf');
    }
  },

  async setTurfStatus(turfId: string, status: 'approved' | 'pending' | 'rejected'): Promise<void> {
    const res = await fetch(`${API_BASE}/turfs/${turfId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update turf verification status');
    }
  },

  async deleteTurf(turfId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/turfs/${turfId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(false),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete turf');
    }
  },

  // Slots
  async getSlots(turfId: string, date: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/slots?turfId=${turfId}&date=${date}`);
    if (!res.ok) return [];
    return res.json();
  },

  async toggleSlotBlock(turfId: string, date: string, startTime: string, status?: string, reason?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/slots/toggle-block`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ turfId: Number(turfId), date, startTime, status, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to toggle slot');
    }
  },

  async holdSlot(turfId: string, date: string, startTime: string): Promise<any> {
    const res = await fetch(`${API_BASE}/slots/hold`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ turfId: Number(turfId), date, startTime }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to hold slot');
    }
    return res.json();
  },

  async releaseSlot(turfId: string, date: string, startTime: string): Promise<void> {
    const res = await fetch(`${API_BASE}/slots/release`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ turfId: Number(turfId), date, startTime }),
    });
    if (!res.ok) {
      console.warn('Failed to release held slot');
    }
  },

  // Bookings
  async getBookings(filters?: { userId?: string; turfId?: string; status?: string; paymentStatus?: string; date?: string }): Promise<Booking[]> {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.turfId) params.append('turfId', filters.turfId);
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.paymentStatus && filters.paymentStatus !== 'all') params.append('paymentStatus', filters.paymentStatus);
    if (filters?.date) params.append('date', filters.date);

    const url = params.toString() ? `${API_BASE}/bookings?${params.toString()}` : `${API_BASE}/bookings`;
    const res = await fetch(url, {
      headers: getAuthHeaders(false),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((b: any) => {
      let notesText = b.notes || '';
      let cancellationReason: string | undefined = undefined;
      let refundStatus: any = b.bookingStatus === 'cancelled' ? 'refunded' : b.bookingStatus === 'cancellation_requested' ? 'pending' : 'none';
      let refundAmount: number | undefined = b.bookingStatus === 'cancelled' ? b.advancePaid : undefined;

      if (b.notes) {
        try {
          const parsed = JSON.parse(b.notes);
          if (parsed && typeof parsed === 'object') {
            notesText = parsed.notes || parsed.teamNotes || '';
            cancellationReason = parsed.cancellationReason || parsed.reason;
            if (parsed.refundStatus) refundStatus = parsed.refundStatus;
            if (parsed.refundAmount) refundAmount = parsed.refundAmount;
          }
        } catch {
          // Plain text notes
        }
      }

      return {
        id: String(b.id),
        bookingCode: b.bookingCode,
        turfId: String(b.turfId),
        turfName: b.turfName || 'Arena',
        turfArea: b.turfArea || 'Dhaka',
        turfCity: b.turfCity || 'Dhaka',
        userId: String(b.userId),
        userName: b.userName || 'Player',
        userPhone: b.userPhone || '+880 1700-000000',
        userEmail: b.userEmail || 'player@turfbd.com',
        date: b.bookingDate,
        startTime: b.startTime,
        endTime: b.endTime,
        durationHours: 1,
        sport: 'football',
        totalAmount: b.amount,
        advancePaid: b.advancePaid,
        dueAmount: b.dueAmount,
        paymentMethod: 'bkash',
        paymentStatus: b.paymentStatus,
        status: b.bookingStatus,
        createdAt: b.createdAt,
        notes: notesText,
        cancellationReason,
        refundStatus,
        refundAmount,
        isCheckedIn: Boolean(b.isCheckedIn),
        checkedInAt: b.checkedInAt || undefined,
        checkedInBy: b.checkedInBy || undefined,
        checkedInByName: b.checkedInByName || undefined,
        qrData: b.qrData || undefined,
      };
    });
  },

  async verifyPass(passData: string, turfId?: string, action: 'checkin' | 'inspect' = 'checkin'): Promise<{
    success?: boolean;
    verified?: boolean;
    canCheckIn?: boolean;
    message?: string;
    checkedIn?: boolean;
    checkedInAt?: string;
    checkedInByName?: string;
    booking: any;
  }> {
    const res = await fetch(`${API_BASE}/bookings/verify-pass`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        passData,
        turfId: turfId ? Number(turfId) : undefined,
        action,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      const err = new Error(json.error || 'Pass verification failed') as any;
      err.data = json;
      err.status = res.status;
      throw err;
    }
    return json;
  },

  async rescheduleBooking(bookingId: string, newDate: string, newStartTime: string, newEndTime: string): Promise<any> {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}/reschedule`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newDate, newStartTime, newEndTime }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reschedule booking');
    }
    return res.json();
  },

  async createBooking(data: {
    userId: string;
    turfId: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    paymentMethod: string;
    isAdvanceOnly: boolean;
    notes?: string;
  }): Promise<Booking> {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        userId: Number(data.userId),
        turfId: Number(data.turfId),
        bookingDate: data.bookingDate,
        startTime: data.startTime,
        endTime: data.endTime,
        paymentMethod: data.paymentMethod,
        isAdvanceOnly: data.isAdvanceOnly,
        notes: data.notes,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create booking');
    }

    const b = await res.json();
    return {
      id: String(b.id),
      bookingCode: b.bookingCode,
      turfId: String(b.turfId),
      turfName: b.turfName,
      turfArea: b.turfArea,
      turfCity: b.turfCity,
      userId: String(b.userId),
      userName: b.userName || 'Player',
      userPhone: b.userPhone || '+880 1711-234567',
      userEmail: b.userEmail || 'player@turfbd.com',
      date: b.bookingDate,
      startTime: b.startTime,
      endTime: b.endTime,
      durationHours: 1,
      sport: 'football',
      totalAmount: b.amount,
      advancePaid: b.advancePaid,
      dueAmount: b.dueAmount,
      paymentMethod: (b.payment?.method || 'bkash') as any,
      paymentStatus: b.paymentStatus,
      transactionId: b.payment?.transactionId,
      status: b.bookingStatus,
      createdAt: b.createdAt,
      notes: b.notes,
      refundStatus: 'none',
    };
  },

  async updateBookingStatus(
    bookingId: string,
    status: string,
    extra?: { notes?: any; paymentStatus?: string }
  ): Promise<void> {
    const payload: any = { status };
    if (extra?.notes !== undefined) payload.notes = extra.notes;
    if (extra?.paymentStatus !== undefined) payload.paymentStatus = extra.paymentStatus;

    const res = await fetch(`${API_BASE}/bookings/${bookingId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update booking status');
    }
  },

  // Reviews
  async getReviews(turfId?: string): Promise<Review[]> {
    const url = turfId ? `${API_BASE}/reviews?turfId=${turfId}` : `${API_BASE}/reviews`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((r: any) => ({
      id: String(r.id),
      turfId: String(r.turfId),
      userId: String(r.userId),
      userName: r.userName || 'Verified Player',
      rating: r.rating,
      comment: r.comment,
      date: new Date(r.createdAt).toISOString().split('T')[0],
      verifiedBooking: true,
      ownerReply: r.ownerReply ? { comment: r.ownerReply, date: 'Recent' } : undefined,
    }));
  },

  async createReview(data: { userId: string; turfId: string; rating: number; comment: string }): Promise<Review> {
    const res = await fetch(`${API_BASE}/reviews`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        userId: Number(data.userId),
        turfId: Number(data.turfId),
        rating: data.rating,
        comment: data.comment,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit review');
    }
    const r = await res.json();
    return {
      id: String(r.id),
      turfId: String(r.turfId),
      userId: String(r.userId),
      userName: 'Verified Player',
      rating: r.rating,
      comment: r.comment,
      date: new Date(r.createdAt).toISOString().split('T')[0],
      verifiedBooking: true,
    };
  },

  async replyToReview(reviewId: string, ownerReply: string): Promise<void> {
    const res = await fetch(`${API_BASE}/reviews/${reviewId}/reply`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ownerReply }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reply to review');
    }
  },

  // Admin Reports
  async getReports(): Promise<any> {
    const res = await fetch(`${API_BASE}/reports`, {
      headers: getAuthHeaders(false),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch admin reports');
    }
    return res.json();
  },

  // Super Admin Demo Management
  async removeDemoTurfs(): Promise<{
    success: boolean;
    message: string;
    removedCount: number;
    removedTurfs: { id: number; name: string; city: string; area: string }[];
  }> {
    const res = await fetch(`${API_BASE}/admin/remove-demo-turfs`, {
      method: 'DELETE',
      headers: getAuthHeaders(true),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Failed to remove demo turfs');
    }
    return res.json();
  },

  async getDemoTurfsStatus(): Promise<{
    success: boolean;
    demoCount: number;
    demoTurfs: any[];
  }> {
    const res = await fetch(`${API_BASE}/admin/demo-turfs-status`, {
      headers: getAuthHeaders(false),
    });
    if (!res.ok) return { success: false, demoCount: 0, demoTurfs: [] };
    return res.json();
  },

  // Payment Gateway Integrations (bKash, Nagad, SSLCommerz)
  async initiatePayment(data: {
    bookingId: string | number;
    gateway: string;
    isAdvanceOnly?: boolean;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
  }): Promise<{
    success: boolean;
    paymentId: number;
    bookingId: number;
    bookingCode: string;
    amount: number;
    currency: string;
    gateway: string;
    redirectUrl: string;
    gatewayPaymentId: string;
    expiresAt: string;
  }> {
    const res = await fetch(`${API_BASE}/payments/initiate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to initiate payment');
    }
    return res.json();
  },

  async verifyPayment(data: {
    paymentId?: number;
    bookingId?: number;
    gateway?: string;
    transactionId?: string;
    valId?: string;
    paymentRefId?: string;
    amount?: number;
  }): Promise<{
    success: boolean;
    verified: boolean;
    status: string;
    payment: any;
    booking: any;
    message?: string;
  }> {
    const res = await fetch(`${API_BASE}/payments/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Payment verification failed');
    }
    return res.json();
  },

  async refundPayment(data: {
    paymentId: number;
    amount?: number;
    reason?: string;
  }): Promise<{
    success: boolean;
    refundTrxId: string;
    payment: any;
    booking: any;
    message?: string;
  }> {
    const res = await fetch(`${API_BASE}/payments/refund`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to process refund');
    }
    return res.json();
  },

  async getOwnerPayments(): Promise<{
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
    payouts?: any[];
  }> {
    const res = await fetch(`${API_BASE}/payments/owner`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch owner financials');
    }
    return res.json();
  },

  async getPayments(filters?: {
    status?: string;
    method?: string;
    turfId?: string;
    userId?: string;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.method) params.append('method', filters.method);
    if (filters?.turfId) params.append('turfId', filters.turfId);
    if (filters?.userId) params.append('userId', filters.userId);

    const res = await fetch(`${API_BASE}/payments?${params.toString()}`, {
      headers: getAuthHeaders(false),
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getOwnerRevenue(): Promise<{
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
  }> {
    const res = await fetch(`${API_BASE}/payments/owner`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch owner revenue data');
    }
    return res.json();
  },

  async getAdminPaymentAudit(): Promise<{
    kpis: {
      totalVolume: number;
      totalCommissionEarned: number;
      commissionRate: string;
      successfulCount: number;
      failedCount: number;
      refundedCount: number;
      totalTransactions: number;
    };
    gatewayStats: {
      bkash: { count: number; volume: number };
      nagad: { count: number; volume: number };
      sslcommerz: { count: number; volume: number };
      cash: { count: number; volume: number };
    };
    auditLogs: any[];
  }> {
    const res = await fetch(`${API_BASE}/payments/admin/audit`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch admin payment audit');
    }
    return res.json();
  },

  async retryPayment(data: {
    bookingId: number;
    gateway?: string;
    isAdvanceOnly?: boolean;
  }): Promise<{
    success: boolean;
    retry: boolean;
    paymentId: number;
    bookingId: number;
    amount: number;
    currency: string;
    gateway: string;
    redirectUrl?: string;
    gatewayPaymentId?: string;
    expiresAt?: string;
  }> {
    const res = await fetch(`${API_BASE}/payments/retry`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to retry payment');
    }
    return res.json();
  },

  async getMyPaymentHistory(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/payments/my-history`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.payments || [];
  },

  async getInvoice(invoiceNumber: string): Promise<any> {
    const res = await fetch(`${API_BASE}/invoices/${invoiceNumber}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.invoice || null;
  },

  async getBookingInvoice(bookingId: number | string): Promise<any> {
    const res = await fetch(`${API_BASE}/invoices/booking/${bookingId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.invoice || null;
  },

  getInvoiceHtmlUrl(invoiceNumber: string): string {
    return `${API_BASE}/invoices/${invoiceNumber}/html`;
  },

  async matchTurfsWithAI(prompt: string): Promise<{
    success: boolean;
    parsedIntent: any;
    recommendationsCount: number;
    turfs: Array<{
      id: string;
      name: string;
      address: string;
      city: string;
      sports: string[];
      hourlyRate: number;
      mainImage: string;
    }>;
    aiSummary: string;
  }> {
    const res = await fetch(`${API_BASE}/ai/match`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to match turfs with AI');
    }
    return res.json();
  },

  // Notification API Client
  async getNotifications(params?: { userId?: number; role?: string; limit?: number }): Promise<{
    success: boolean;
    notifications: AppNotification[];
    unreadCount: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.append('userId', String(params.userId));
    if (params?.role) searchParams.append('role', params.role);
    if (params?.limit) searchParams.append('limit', String(params.limit));

    const res = await fetch(`${API_BASE}/notifications?${searchParams.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch notifications');
    }
    return res.json();
  },

  async markNotificationRead(id: number): Promise<{ success: boolean; notification: AppNotification }> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to mark notification as read');
    }
    return res.json();
  },

  async markAllNotificationsRead(params?: { userId?: number; role?: string }): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params || {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to mark all notifications as read');
    }
    return res.json();
  },

  async deleteNotification(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/notifications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete notification');
    }
    return res.json();
  },

  async seedSampleNotifications(userId?: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/notifications/seed-sample`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId: userId || 1 }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to seed sample notifications');
    }
    return res.json();
  },

  // ==========================================
  // PHASE 8: OWNER VERIFICATION, PRICING, GALLERY & PAYOUTS
  // ==========================================

  async getAdminOwners(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/auth/owners`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch owner verification applications');
    }
    return res.json();
  },

  async updateOwnerVerification(
    ownerId: number | string,
    status: 'approved' | 'rejected' | 'suspended',
    reason?: string
  ): Promise<{ success: boolean; message: string; user: any }> {
    const res = await fetch(`${API_BASE}/auth/owners/${ownerId}/verification`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update owner verification status');
    }
    return res.json();
  },

  async getTurfGallery(turfId: number | string): Promise<{ images: string[]; mainImage: string | null; facilityImages: string[] }> {
    const res = await fetch(`${API_BASE}/turfs/${turfId}/gallery`, {
      headers: getAuthHeaders(false),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch turf gallery');
    }
    return res.json();
  },

  async addTurfGalleryImages(
    turfId: number | string,
    images: string[] | string
  ): Promise<{ success: boolean; images: string[]; mainImage: string }> {
    const res = await fetch(`${API_BASE}/turfs/${turfId}/gallery`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(Array.isArray(images) ? { images } : { imageUrl: images }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add gallery images');
    }
    return res.json();
  },

  async reorderTurfGallery(
    turfId: number | string,
    images: string[]
  ): Promise<{ success: boolean; images: string[]; mainImage: string }> {
    const res = await fetch(`${API_BASE}/turfs/${turfId}/gallery/reorder`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ images }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reorder gallery');
    }
    return res.json();
  },

  async setTurfCoverImage(
    turfId: number | string,
    coverImage: string
  ): Promise<{ success: boolean; mainImage: string; images: string[] }> {
    const res = await fetch(`${API_BASE}/turfs/${turfId}/gallery/cover`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ coverImage }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to set main cover image');
    }
    return res.json();
  },

  async setTurfGalleryCover(turfId: number | string, imageUrl: string) {
    return api.setTurfCoverImage(turfId, imageUrl);
  },

  async uploadImage(formData: FormData): Promise<{ url: string; [key: string]: any }> {
    const token = api.getToken();
    const res = await fetch(`${API_BASE}/uploads/turf-images`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload image file');
    }
    const json = await res.json();
    const url = json.imageUrl || json.files?.[0]?.imageUrl || json.images?.[0]?.imageUrl || '';
    return { url, ...json };
  },

  async getCurrentUser(): Promise<User> {
    const user = await api.getMe();
    if (!user) throw new Error('Not authenticated');
    return user;
  },

  async deleteTurfGalleryImage(
    turfId: number | string,
    params: { imageUrl?: string; index?: number }
  ): Promise<{ success: boolean; images: string[]; mainImage: string }> {
    const res = await fetch(`${API_BASE}/turfs/${turfId}/gallery`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete gallery image');
    }
    return res.json();
  },

  async blockSlotsBulk(
    turfId: number | string,
    slots: { date: string; startTime: string }[],
    reason?: string,
    confirmConflicts?: boolean
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/slots/block-bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ turfId: Number(turfId), slots, reason, confirmConflicts }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 409 && err.conflict) {
        const error: any = new Error(err.warning || 'Slot conflict detected');
        error.conflict = true;
        error.conflictingBookings = err.conflictingBookings;
        throw error;
      }
      throw new Error(err.error || 'Failed to bulk block slots');
    }
    return res.json();
  },

  async blockSlotDay(
    turfId: number | string,
    date: string,
    reason?: string,
    confirmConflicts?: boolean
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/slots/block-day`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ turfId: Number(turfId), date, reason, confirmConflicts }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 409 && err.conflict) {
        const error: any = new Error(err.warning || 'Slot conflict detected');
        error.conflict = true;
        error.conflictingBookings = err.conflictingBookings;
        throw error;
      }
      throw new Error(err.error || 'Failed to block entire day');
    }
    return res.json();
  },

  async blockSlotRange(
    turfId: number | string,
    startDate: string,
    endDate: string,
    reason?: string,
    confirmConflicts?: boolean
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/slots/block-range`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ turfId: Number(turfId), startDate, endDate, reason, confirmConflicts }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 409 && err.conflict) {
        const error: any = new Error(err.warning || 'Slot conflict detected');
        error.conflict = true;
        error.conflictingBookings = err.conflictingBookings;
        throw error;
      }
      throw new Error(err.error || 'Failed to block date range');
    }
    return res.json();
  },

  async unblockSlots(
    turfId: number | string,
    params: { slots?: { date: string; startTime: string }[]; date?: string }
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/slots/unblock`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ turfId: Number(turfId), ...params }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to unblock slots');
    }
    return res.json();
  },

  async requestOwnerPayout(data: {
    amount: number;
    method: 'bkash' | 'nagad' | 'bank_transfer' | 'rocket';
    accountNumber: string;
    accountDetails?: any;
    notes?: string;
  }): Promise<{ success: boolean; message: string; payout: any; remainingAvailableBalance: number }> {
    const res = await fetch(`${API_BASE}/payments/owner/payout-request`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit payout request');
    }
    return res.json();
  },

  async getAdminPayouts(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/payments/admin/payouts`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch admin payouts');
    }
    return res.json();
  },

  async updateAdminPayout(
    payoutId: number | string,
    action: 'approve' | 'reject' | 'dispatch',
    extra?: { rejectionReason?: string; transactionReference?: string; notes?: string }
  ): Promise<{ success: boolean; message: string; payout: any }> {
    const res = await fetch(`${API_BASE}/payments/admin/payouts/${payoutId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, ...extra }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update payout request');
    }
    return res.json();
  },

  // Disputes & Refund Reviews (Phase 9)
  async getDisputes(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/payments/disputes`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch disputes');
    }
    return res.json();
  },

  async fileDispute(data: {
    bookingId: number | string;
    reason: string;
    description: string;
    requestedAmount?: number;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/payments/disputes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to file dispute');
    }
    return res.json();
  },

  async updateDispute(
    disputeId: number | string,
    action: 'review' | 'refund' | 'reject',
    extra?: { adminNotes?: string }
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/payments/disputes/${disputeId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, ...extra }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update dispute');
    }
    return res.json();
  },

  // Turf Moderation & Badge Verification
  async moderateTurf(
    turfId: number | string,
    status: 'approved' | 'rejected' | 'suspended',
    extra?: { rejectionReason?: string; suspensionReason?: string }
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/turfs/${turfId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        verificationStatus: status,
        ...extra,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to moderate turf');
    }
    return res.json();
  },

  async updateTurfBadge(
    turfId: number | string,
    verifiedBadge: 'standard' | 'turfbd_verified' | 'gold_partner'
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/turfs/${turfId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ verifiedBadge }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update venue badge');
    }
    return res.json();
  },
};
