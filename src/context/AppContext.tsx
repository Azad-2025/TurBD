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
  activeTab: 'browse' | 'my-bookings' | 'owner-dashboard' | 'admin-panel';
  setActiveTab: (tab: 'browse' | 'my-bookings' | 'owner-dashboard' | 'admin-panel') => void;
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
  switchRole: (role: UserRole) => void;
  addTurf: (turf: Omit<Turf, 'id' | 'rating' | 'reviewCount' | 'status'>) => Promise<void>;
  updateTurf: (id: string, updates: Partial<Turf>) => Promise<void>;
  setTurfStatus: (id: string, status: 'approved' | 'rejected') => Promise<void>;
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
  refreshData: () => Promise<void>;
}

const defaultFilters: SearchFilters = {
  query: '',
  city: 'All Cities',
  area: 'All Areas',
  sport: 'all',
  date: new Date().toISOString().split('T')[0],
  maxPrice: 3500,
  amenity: 'all',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(INITIAL_USERS[0]);
  const [turfs, setTurfs] = useState<Turf[]>(INITIAL_TURFS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [blockedSlots, setBlockedSlots] = useState<Record<string, boolean>>({});

  const [activeTab, setActiveTab] = useState<'browse' | 'my-bookings' | 'owner-dashboard' | 'admin-panel'>('browse');
  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);
  const [bookingTurf, setBookingTurf] = useState<Turf | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>(defaultFilters);

  // Fetch live data from PostgreSQL API on mount
  const refreshData = async () => {
    try {
      // Ensure we have a valid JWT token on startup
      if (!api.getToken()) {
        try {
          const user = await api.login('tanvir@turfbd.com', 'password123');
          setCurrentUser(user);
        } catch {
          // fallback
        }
      } else {
        const me = await api.getMe();
        if (me) setCurrentUser(me);
      }

      const [fetchedTurfs, fetchedBookings, fetchedReviews, fetchedUsers] = await Promise.all([
        api.getTurfs(),
        api.getBookings(),
        api.getReviews(),
        api.getUsers(),
      ]);

      if (fetchedTurfs.length > 0) setTurfs(fetchedTurfs);
      if (fetchedBookings.length > 0) setBookings(fetchedBookings);
      if (fetchedReviews.length > 0) setReviews(fetchedReviews);
      if (fetchedUsers.length > 0) {
        setUsers(fetchedUsers);
        // keep current user in sync
        if (currentUser) {
          const matched = fetchedUsers.find((u) => u.email.toLowerCase() === currentUser.email.toLowerCase());
          if (matched) setCurrentUser(matched);
        }
      }
    } catch (err) {
      console.error('Initial PostgreSQL API sync error:', err);
    }
  };

  useEffect(() => {
    refreshData();

    // Listen for OAuth success messages from popup windows
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { token, refreshToken, user } = event.data;
        if (token) {
          api.setToken(token, refreshToken);
        }
        if (user) {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          refreshData();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const resetFilters = () => {
    setSearchFilters(defaultFilters);
  };

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      const loggedUser = await api.login(email, password);
      setCurrentUser(loggedUser);
      setIsAuthModalOpen(false);
      await refreshData();
      return true;
    } catch (e) {
      // Fallback to local user state if needed
      const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        setCurrentUser(user);
        setIsAuthModalOpen(false);
        return true;
      }
      return false;
    }
  };

  const logout = async () => {
    await api.logout();
    setCurrentUser(null);
    setActiveTab('browse');
  };

  const register = async (name: string, email: string, phone: string, role: UserRole, password?: string) => {
    try {
      const newUser = await api.register({ name, email, phone, role, password });
      setCurrentUser(newUser);
      setUsers((prev) => [...prev, newUser]);
      setIsAuthModalOpen(false);
      await refreshData();
    } catch (err: any) {
      console.error('Failed to register on PostgreSQL:', err);
      throw err;
    }
  };

  const sendPhoneOtp = async (phone: string) => {
    return await api.sendOtp(phone);
  };

  const loginWithPhoneOtp = async (phone: string, code: string, name?: string, role?: UserRole): Promise<boolean> => {
    try {
      const { user } = await api.verifyOtp(phone, code, name, role);
      setCurrentUser(user);
      setIsAuthModalOpen(false);
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

      // If provider is configured with real client credentials, launch popup
      if (authInfo.configured) {
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2.5;

        window.open(
          authInfo.url,
          `${provider}_oauth_popup`,
          `width=${width},height=${height},left=${left},top=${top},status=yes,scrollbars=yes`
        );
      } else {
        // Instant 1-click preview authentication
        const { user } = await api.socialLoginMock(provider);
        setCurrentUser(user);
        setIsAuthModalOpen(false);
        await refreshData();
      }
    } catch (err) {
      console.error(`${provider} login failed:`, err);
      // Fallback to mock login
      const { user } = await api.socialLoginMock(provider);
      setCurrentUser(user);
      setIsAuthModalOpen(false);
      await refreshData();
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

  const switchRole = async (role: UserRole) => {
    const emailByRole: Record<string, string> = {
      customer: 'tanvir@turfbd.com',
      player: 'tanvir@turfbd.com',
      owner: 'owner@gulshanarena.com',
      admin: 'admin@turfbd.com',
    };
    const targetEmail = emailByRole[role] || 'tanvir@turfbd.com';

    try {
      const loggedUser = await api.login(targetEmail, 'password123');
      setCurrentUser(loggedUser);
    } catch (err) {
      console.error('Failed to switch persona via login:', err);
      const existing = users.find((u) => u.role === role);
      if (existing) setCurrentUser(existing);
    }

    if (role === 'owner') {
      setActiveTab('owner-dashboard');
    } else if (role === 'admin') {
      setActiveTab('admin-panel');
    } else {
      setActiveTab('browse');
    }
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

  const setTurfStatus = async (id: string, status: 'approved' | 'rejected') => {
    setTurfs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    );
    await api.setTurfStatus(id, status).catch(console.error);
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
        switchRole,
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
