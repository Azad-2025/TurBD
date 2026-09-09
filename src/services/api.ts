import { Turf, Booking, Review, User, UserRole, SportType } from '../types';

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
    role: u.role as UserRole,
    avatar: u.profileImage,
    isEmailVerified: u.isEmailVerified,
    isPhoneVerified: u.isPhoneVerified,
    googleId: u.googleId,
    facebookId: u.facebookId,
    createdAt: u.createdAt,
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

  // Social OAuth
  async getGoogleAuthUrl(): Promise<{ url: string; configured: boolean; redirectUri: string }> {
    const res = await fetch(`${API_BASE}/auth/google/url`);
    if (!res.ok) throw new Error('Failed to get Google OAuth URL');
    return res.json();
  },

  async getFacebookAuthUrl(): Promise<{ url: string; configured: boolean; redirectUri: string }> {
    const res = await fetch(`${API_BASE}/auth/facebook/url`);
    if (!res.ok) throw new Error('Failed to get Facebook OAuth URL');
    return res.json();
  },

  async socialLoginMock(provider: 'google' | 'facebook'): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/social/mock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Social login failed');
    if (json.token) {
      api.setToken(json.token, json.refreshToken || null);
    }
    return { user: mapUser(json.user), token: json.token };
  },

  // Auth & Users
  async register(data: { name: string; phone: string; email: string; password?: string; role?: string }): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ...data, password: data.password || 'password123' }),
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
      body: JSON.stringify({ email, password: password || 'password123' }),
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

  // Turfs
  async getTurfs(city?: string): Promise<Turf[]> {
    const url = city && city !== 'All Cities' ? `${API_BASE}/turfs?city=${encodeURIComponent(city)}` : `${API_BASE}/turfs`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((t: any) => ({
      id: String(t.id),
      name: t.turfName,
      tagline: `Premier arena in ${t.address}`,
      description: `Modern sports facility with high-density grass, bright floodlights, and clean amenities in ${t.city}.`,
      city: t.city,
      area: t.address.split(',')[0] || t.city,
      address: t.address,
      sports: t.sportType || ['football'],
      size: '7 vs 7 & Box Cricket',
      surface: t.surfaceType,
      hourlyRate: t.pricePerHour,
      peakHourRate: Math.round(t.pricePerHour * 1.15),
      images: Array.isArray(t.images) && t.images.length > 0 ? t.images : ['https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80'],
      amenities: ['Floodlights', 'Locker Room', 'Shower', 'Bibs & Match Balls', 'Reserved Parking'],
      status: t.verificationStatus,
      ownerId: String(t.ownerId),
      ownerName: t.ownerName || 'Turf Owner',
      ownerPhone: t.ownerPhone || '+880 1819-876543',
      rating: 4.9,
      reviewCount: 24,
      openingTime: t.openingTime,
      closingTime: t.closingTime,
      isFeatured: true,
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

  async toggleSlotBlock(turfId: string, date: string, startTime: string, status?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/slots/toggle-block`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ turfId: Number(turfId), date, startTime, status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to toggle slot');
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
    const res = await fetch(url);
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
      };
    });
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
      userName: 'Player',
      userPhone: '+880 1711-234567',
      userEmail: 'tanvir@turfbd.com',
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
};
