import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserRole,
  Turf,
  Booking,
  Review,
  SearchFilters,
  BookingStatus,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_TURFS,
  INITIAL_BOOKINGS,
  INITIAL_REVIEWS,
} from '../data/mockData';
import { api } from '../services/api';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  turfs: Turf[];
  bookings: Booking[];
  reviews: Review[];
  activeTab: 'browse' | 'home' | 'explore' | 'my-bookings' | 'profile' | 'owner-dashboard' | 'admin-panel';
  setActiveTab: (tab: 'browse' | 'home' | 'explore' | 'my-bookings' | 'profile' | 'owner-dashboard' | 'admin-panel') => void;
  realtimeConnected: boolean;
  lastRealtimeUpdate: Date | null;
  slotUpdateCounter: number;
  selectedTurf: Turf | null;
  setSelectedTurf: (turf: Turf | null) => void;
  bookingTurf: Turf | null;
  setBookingTurf: (turf: Turf | null) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authMode: 'signin' | 'signup';
  setAuthMode: (mode: 'signin' | 'signup') => void;
  searchFilters: SearchFilters;
  setSearchFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  resetFilters: () => void;
  blockedSlots: Record<string, boolean>; // key: `${turfId}_${date}_${time}`
  toggleSlotBlock: (turfId: string, date: string, time: string, status?: string) => Promise<void>;

  // Actions connected to PostgreSQL API
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (name: string, email: string, phone: string, role: UserRole, password?: string) => Promise<void>;
  sendPhoneOtp: (phone: string) => Promise<{ success: boolean; message: string; phone: string; demoCode?: string }>;
  loginWithPhoneOtp: (phone: string, code: string, name?: string, role?: UserRole) => Promise<boolean>;
  loginWithSocial: (provider: 'google' | 'facebook') => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string; resetToken?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message: string }>;
  addTurf: (turf: Omit<Turf, 'id' | 'rating' | 'reviewCount' | 'status'>) => Promise<void>;
  updateTurf: (id: string, updates: Partial<Turf>) => Promise<void>;
  setTurfStatus: (id: string, status: 'approved' | 'rejected' | 'suspended', reason?: string) => Promise<void>;
  createBooking: (bookingData: Omit<Booking, 'id' | 'bookingCode' | 'createdAt'>) => Promise<Booking>;
  updateBookingStatus: (
    bookingId: string,
    status: BookingStatus,
    extra?: { notes?: any; cancellationReason?: string; refundStatus?: any; paymentStatus?: string }
  ) => Promise<void>;
  refreshBookings: (filters?: { userId?: string; turfId?: string; status?: string; paymentStatus?: string; date?: string }) => Promise<void>;
  addReview: (turfId: string, rating: number, comment: string) => Promise<void>;
  addOwnerReply: (reviewId: string, comment: string) => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  // Super Admin safe preview capability
  previewRole: 'customer' | 'owner' | null;
  setPreviewRole: (role: 'customer' | 'owner' | null) => void;

  // Profile management & photo methods
  setCurrentUser: (user: User | null) => void;
  updateProfile: (data: { name?: string; phone?: string; location?: string; profileImage?: string }) => Promise<User>;
  uploadAvatar: (file: File) => Promise<string>;
  deleteAvatar: () => Promise<void>;

  favorites: string[];
  toggleFavorite: (turfId: string) => void;
}

const defaultFilters: SearchFilters = {
  query: '',
  city: 'All Cities',
  area: 'All Areas',
  sport: 'all',
  date: new Date().toISOString().split('T')[0],
  timeSlot: 'all',
  venueType: 'all',
  verifiedOnly: false,
  badge: 'all',
  maxDistanceKm: 25,
  sortBy: 'recommended',
  maxPrice: 3500,
  amenity: 'all',
  userLocation: {
    latitude: 23.7925,
    longitude: 90.4152,
    name: 'Gulshan 2, Dhaka',
    isDetected: false,
  },
  viewMode: 'split',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<Record<string, boolean>>({});
  const [realtimeConnected, setRealtimeConnected] = useState<boolean>(false);
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<Date | null>(null);
  const [slotUpdateCounter, setSlotUpdateCounter] = useState<number>(0);

  // Super Admin safe preview simulation (Customer or Owner layout)
  const [previewRole, setPreviewRoleState] = useState<'customer' | 'owner' | null>(null);

  const [activeTab, setActiveTabState] = useState<'browse' | 'home' | 'explore' | 'my-bookings' | 'profile' | 'owner-dashboard' | 'admin-panel'>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('turfbd_active_tab');
      if (saved) return saved as any;
    }
    return 'home';
  });

  const setActiveTab = (tab: 'browse' | 'home' | 'explore' | 'my-bookings' | 'profile' | 'owner-dashboard' | 'admin-panel') => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('turfbd_active_tab', tab);
    }
  };

  const setPreviewRole = (role: 'customer' | 'owner' | null) => {
    if ((currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') || !currentUser?.isSuperAdmin) {
      setPreviewRoleState(null);
      return;
    }
    setPreviewRoleState(role);
    if (role === 'customer') {
      setActiveTab('home');
    } else if (role === 'owner') {
      setActiveTab('owner-dashboard');
    } else {
      setActiveTab('admin-panel');
    }
  };

  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);
  const [bookingTurf, setBookingTurf] = useState<Turf | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>(defaultFilters);
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('turfbd_favorites');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0FA958');
      try {
        localStorage.removeItem('turfbd_theme');
      } catch {
        // ignore
      }
    }
  }, []);

  const toggleFavorite = (turfId: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(turfId)
        ? prev.filter((id) => id !== turfId)
        : [...prev, turfId];
      try {
        localStorage.setItem('turfbd_favorites', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Fetch live data from PostgreSQL API on mount
  const refreshData = async () => {
    try {
      let activeUser: User | null = null;
      // Validate active authenticated session if token exists
      if (api.getToken()) {
        try {
          const me = await api.getMe();
          if (me) {
            activeUser = me;
            setCurrentUser(me);
            // Restore role view if user didn't explicitly pick a sub-page
            const savedTab = typeof window !== 'undefined' ? sessionStorage.getItem('turfbd_active_tab') : null;
            if (!savedTab || savedTab === 'home' || savedTab === 'browse') {
              if (me.role === 'admin' || me.role === 'super_admin') {
                setActiveTab('admin-panel');
              } else if (me.role === 'owner') {
                setActiveTab('owner-dashboard');
              }
            }
          } else {
            setCurrentUser(null);
          }
        } catch {
          api.setToken(null, null);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }

      const [fetchedTurfs, fetchedBookings, fetchedReviews, fetchedUsers] = await Promise.all([
        api.getTurfs(),
        api.getBookings(),
        api.getReviews(),
        api.getUsers(),
      ]);

      let combinedTurfs = fetchedTurfs || [];
      if (activeUser && (activeUser as User).role === 'owner') {
        try {
          const ownerTurfs = await api.getOwnerTurfs((activeUser as User).id);
          const existingIds = new Set(combinedTurfs.map((t) => t.id));
          const ownerOnlyTurfs = ownerTurfs.filter((t) => !existingIds.has(t.id));
          combinedTurfs = [...ownerOnlyTurfs, ...combinedTurfs];
        } catch {
          // ignore
        }
      }

      setTurfs(combinedTurfs);
      setBookings(fetchedBookings || []);
      setReviews(fetchedReviews || []);
      setUsers(fetchedUsers || []);
    } catch (err) {
      console.error('Initial PostgreSQL API sync error:', err);
    }
  };

  useEffect(() => {
    refreshData();

    // Listen for OAuth success messages from popup windows
    const handleMessage = (event: MessageEvent) => {
      // Validate origin if coming from browser window
      const origin = event.origin;
      if (origin && !origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { token, refreshToken, user } = event.data;
        if (token) {
          api.setToken(token, refreshToken);
        }
        if (user) {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          // Route user to appropriate interface based on server-authoritative role
          if (user.role === 'admin' || user.role === 'super_admin') {
            setActiveTab('admin-panel');
          } else if (user.role === 'owner') {
            setActiveTab('owner-dashboard');
          } else {
            setActiveTab('browse');
          }
          refreshData();
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Setup Real-time Server-Sent Events (SSE) listener for live availability sync
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        const token = api.getToken() || '';
        const sseUrl = token ? `/api/realtime/events?token=${encodeURIComponent(token)}` : '/api/realtime/events';
        eventSource = new EventSource(sseUrl);

        eventSource.onopen = () => {
          setRealtimeConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data);
            setLastRealtimeUpdate(new Date());

            if (payload.type === 'SLOT_CHANGED') {
              const { turfId, date, startTime, status } = payload;
              const key = `${turfId}_${date}_${startTime}`;
              setBlockedSlots((prev) => ({
                ...prev,
                [key]: status !== 'available',
              }));
              setSlotUpdateCounter((c) => c + 1);
            } else if (payload.type === 'BOOKING_STATUS_CHANGED' || payload.type === 'BOOKING_CREATED') {
              if (payload.bookingId && payload.status) {
                setBookings((prev) =>
                  prev.map((b) =>
                    String(b.id) === String(payload.bookingId)
                      ? { ...b, status: payload.status as BookingStatus }
                      : b
                  )
                );
              }
              // Keep bookings in sync
              api.getBookings().then((updated) => {
                if (updated && updated.length > 0) setBookings(updated);
              }).catch(() => {});
            } else if (payload.type === 'TURF_STATUS_CHANGED') {
              if (payload.turfId && payload.status) {
                setTurfs((prev) =>
                  prev.map((t) =>
                    String(t.id) === String(payload.turfId)
                      ? { ...t, status: payload.status as any }
                      : t
                  )
                );
              }
            }
          } catch (err) {
            console.warn('Failed to parse realtime event:', err);
          }
        };

        eventSource.onerror = () => {
          setRealtimeConnected(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          reconnectTimeout = setTimeout(connectSSE, 4000);
        };
      } catch (err) {
        console.warn('Realtime SSE connection failed, retrying in 5s...', err);
        reconnectTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    return () => {
      window.removeEventListener('message', handleMessage);
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const resetFilters = () => {
    setSearchFilters(defaultFilters);
  };

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      if (typeof window !== 'undefined') sessionStorage.removeItem('turfbd_logged_out');
      const loggedUser = await api.login(email, password);
      setCurrentUser(loggedUser);
      setIsAuthModalOpen(false);
      if (loggedUser.role === 'admin' || loggedUser.role === 'super_admin') {
        setActiveTab('admin-panel');
      } else if (loggedUser.role === 'owner') {
        setActiveTab('owner-dashboard');
      } else {
        setActiveTab('home');
      }
      await refreshData();
      return true;
    } catch (e) {
      console.error('Login error:', e);
      return false;
    }
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('turfbd_logged_out', '1');
      sessionStorage.removeItem('turfbd_active_tab');
    }
    await api.logout();
    setCurrentUser(null);
    setBookings([]);
    setPreviewRole(null);
    setActiveTab('home');
  };

  const register = async (name: string, email: string, phone: string, role: UserRole, password?: string) => {
    try {
      if (typeof window !== 'undefined') sessionStorage.removeItem('turfbd_logged_out');
      const newUser = await api.register({ name, email, phone, role, password });
      setCurrentUser(newUser);
      setIsAuthModalOpen(false);
      if (newUser.role === 'owner') {
        setActiveTab('owner-dashboard');
      } else {
        setActiveTab('home');
      }
      await refreshData();
    } catch (err: any) {
      console.error('Failed to register on PostgreSQL:', err);
      throw err;
    }
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    const res = await api.uploadAvatar(file);
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        avatar: res.profileImage,
      });
    }
    return res.profileImage;
  };

  const deleteAvatar = async (): Promise<void> => {
    await api.deleteAvatar();
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        avatar: undefined,
      });
    }
  };

  const updateProfile = async (data: { name?: string; phone?: string; location?: string; profileImage?: string }) => {
    const updated = await api.updateProfile(data);
    setCurrentUser(updated);
    return updated;
  };

  const sendPhoneOtp = async (phone: string) => {
    return await api.sendOtp(phone);
  };

  const loginWithPhoneOtp = async (phone: string, code: string, name?: string, role?: UserRole): Promise<boolean> => {
    try {
      if (typeof window !== 'undefined') sessionStorage.removeItem('turfbd_logged_out');
      const { user } = await api.verifyOtp(phone, code, name, role);
      setCurrentUser(user);
      setIsAuthModalOpen(false);
      if (user.role === 'admin' || user.role === 'super_admin') {
        setActiveTab('admin-panel');
      } else if (user.role === 'owner') {
        setActiveTab('owner-dashboard');
      } else {
        setActiveTab('home');
      }
      await refreshData();
      return true;
    } catch (err) {
      console.error('Phone OTP login failed:', err);
      throw err;
    }
  };

  const loginWithSocial = async (provider: 'google' | 'facebook') => {
    try {
      const authInfo = provider === 'google' ? await api.getGoogleAuthUrl() : await api.getFacebookAuthUrl();

      if (authInfo.enabled === false) {
        throw new Error(authInfo.error || `${provider === 'google' ? 'Google' : 'Facebook'} Login is temporarily disabled.`);
      }

      if (authInfo.configured && authInfo.url) {
        const width = 500;
        const height = 620;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2.5;

        const popup = window.open(
          authInfo.url,
          `${provider}_oauth_popup`,
          `width=${width},height=${height},left=${left},top=${top},status=yes,scrollbars=yes`
        );
        if (!popup) {
          throw new Error('Popup window was blocked by your browser. Please allow popups for TurfBD to complete login.');
        }
      } else {
        const providerName = provider === 'google' ? 'Google' : 'Facebook';
        const requiredVars = provider === 'google' ? 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET' : 'FACEBOOK_APP_ID and FACEBOOK_APP_SECRET';
        const errorMsg = authInfo.error || `${providerName} Login is not configured on the server. Required environment variables: ${requiredVars}. Callback URL: ${authInfo.redirectUri}`;
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error(`${provider} login failed:`, err);
      throw err;
    }
  };

  const forgotPassword = async (email: string) => {
    return await api.forgotPassword(email);
  };

  const resetPassword = async (token: string, newPassword: string) => {
    return await api.resetPassword(token, newPassword);
  };

  const verifyEmail = async (token: string) => {
    return await api.verifyEmail(token);
  };

  const toggleSlotBlock = async (turfId: string, date: string, time: string, status?: string) => {
    const key = `${turfId}_${date}_${time}`;
    setBlockedSlots((prev) => ({
      ...prev,
      [key]: status ? (status === 'available' ? false : true) : !prev[key],
    }));

    try {
      await api.toggleSlotBlock(turfId, date, time, status);
    } catch (err) {
      console.error('Failed to persist slot block:', err);
    }
  };

  const addTurf = async (turfData: Omit<Turf, 'id' | 'rating' | 'reviewCount' | 'status'>) => {
    try {
      const created = await api.createTurf({
        ...turfData,
        ownerId: currentUser?.id || '2',
      });
      setTurfs((prev) => [created, ...prev]);
    } catch (err) {
      console.error('Failed to add turf in database:', err);
      // Optimistic fallback
      const newTurf: Turf = {
        ...turfData,
        id: `turf-${Date.now()}`,
        rating: 5.0,
        reviewCount: 0,
        status: 'pending', // BUG-02: Default creation status is pending admin approval
      };
      setTurfs((prev) => [newTurf, ...prev]);
    }
  };

  const updateTurf = async (id: string, updates: Partial<Turf>) => {
    setTurfs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    if (selectedTurf?.id === id) {
      setSelectedTurf((prev) => (prev ? { ...prev, ...updates } : null));
    }
    await api.updateTurf(id, updates).catch(console.error);
  };

  const setTurfStatus = async (id: string, status: 'approved' | 'rejected' | 'suspended', reason?: string) => {
    setTurfs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    );
    await api.moderateTurf(id, status, {
      rejectionReason: status === 'rejected' ? reason : undefined,
      suspensionReason: status === 'suspended' ? reason : undefined,
    }).catch(console.error);
  };

  const createBooking = async (bookingData: Omit<Booking, 'id' | 'bookingCode' | 'createdAt'>): Promise<Booking> => {
    try {
      const isAdvanceOnly = bookingData.dueAmount > 0;
      const created = await api.createBooking({
        userId: currentUser?.id || '1',
        turfId: bookingData.turfId,
        bookingDate: bookingData.date,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        paymentMethod: bookingData.paymentMethod,
        isAdvanceOnly,
        notes: bookingData.notes,
      });

      setBookings((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      console.error('Failed to create booking in database:', err);
      const randomCode = `TBD-${Math.floor(1000 + Math.random() * 9000)}`;
      const fallbackBooking: Booking = {
        ...bookingData,
        id: `booking-${Date.now()}`,
        bookingCode: randomCode,
        createdAt: new Date().toISOString(),
      };
      setBookings((prev) => [fallbackBooking, ...prev]);
      return fallbackBooking;
    }
  };

  const updateBookingStatus = async (
    bookingId: string,
    status: BookingStatus,
    extra?: { notes?: any; cancellationReason?: string; refundStatus?: any; paymentStatus?: string }
  ) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          return {
            ...b,
            status,
            ...(extra?.notes ? { notes: typeof extra.notes === 'string' ? extra.notes : JSON.stringify(extra.notes) } : {}),
            ...(extra?.cancellationReason ? { cancellationReason: extra.cancellationReason } : {}),
            ...(extra?.refundStatus ? { refundStatus: extra.refundStatus } : {}),
            ...(extra?.paymentStatus ? { paymentStatus: extra.paymentStatus as any } : {}),
          };
        }
        return b;
      })
    );

    let notesToSend: any = undefined;
    if (extra?.notes || extra?.cancellationReason || extra?.refundStatus) {
      notesToSend = {
        notes: typeof extra.notes === 'string' ? extra.notes : undefined,
        cancellationReason: extra.cancellationReason,
        refundStatus: extra.refundStatus,
        refundAmount: status === 'cancelled' ? undefined : undefined,
      };
    }

    await api
      .updateBookingStatus(bookingId, status, {
        notes: notesToSend,
        paymentStatus: extra?.paymentStatus,
      })
      .catch(console.error);

    // Also reload bookings to sync fresh data
    try {
      const fresh = await api.getBookings();
      if (fresh && fresh.length > 0) {
        setBookings(fresh);
      }
    } catch (e) {
      // Ignored
    }
  };

  const refreshBookings = async (filters?: { userId?: string; turfId?: string; status?: string; paymentStatus?: string; date?: string }) => {
    try {
      const fresh = await api.getBookings(filters);
      if (fresh) {
        setBookings(fresh);
      }
    } catch (e) {
      console.error('Failed to refresh bookings:', e);
    }
  };

  const addReview = async (turfId: string, rating: number, comment: string) => {
    if (!currentUser) return;
    try {
      const created = await api.createReview({
        userId: currentUser.id,
        turfId,
        rating,
        comment,
      });
      const updatedReviews = [created, ...reviews];
      setReviews(updatedReviews);

      const turfRevs = updatedReviews.filter((r) => r.turfId === turfId);
      const avg = turfRevs.reduce((acc, r) => acc + r.rating, 0) / turfRevs.length;
      updateTurf(turfId, {
        rating: parseFloat(avg.toFixed(1)),
        reviewCount: turfRevs.length,
      });
    } catch (err) {
      console.error('Failed to add review:', err);
    }
  };

  const addOwnerReply = async (reviewId: string, comment: string) => {
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              ownerReply: {
                comment,
                date: new Date().toISOString().split('T')[0],
              },
            }
          : r
      )
    );
    await api.replyToReview(reviewId, comment).catch(console.error);
  };

  const updateUserRole = async (userId: string, role: UserRole) => {
    await api.updateUserRole(userId, role);
    await refreshData();
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        turfs,
        bookings,
        reviews,
        activeTab,
        setActiveTab,
        realtimeConnected,
        lastRealtimeUpdate,
        slotUpdateCounter,
        selectedTurf,
        setSelectedTurf,
        bookingTurf,
        setBookingTurf,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authMode,
        setAuthMode,
        searchFilters,
        setSearchFilters,
        resetFilters,
        blockedSlots,
        toggleSlotBlock,
        login,
        logout,
        register,
        sendPhoneOtp,
        loginWithPhoneOtp,
        loginWithSocial,
        forgotPassword,
        resetPassword,
        verifyEmail,
        addTurf,
        updateTurf,
        setTurfStatus,
        createBooking,
        updateBookingStatus,
        refreshBookings,
        addReview,
        addOwnerReply,
        updateUserRole,
        refreshData,
        previewRole,
        setPreviewRole,
        setCurrentUser,
        updateProfile,
        uploadAvatar,
        deleteAvatar,
        favorites,
        toggleFavorite,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
