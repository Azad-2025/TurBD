import React, { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon,
  Phone,
  Mail,
  CheckCircle2,
  CalendarCheck2,
  Trophy,
  ShieldCheck,
  LogOut,
  Sparkles,
  Building2,
  HelpCircle,
  ChevronRight,
  ShieldAlert,
  Edit3,
  Lock,
  Heart,
  MapPin,
  Smartphone,
  KeyRound,
  X,
  ExternalLink,
  RefreshCw,
  Clock,
  Star,
  Upload,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole, Turf } from '../types';
import { api } from '../services/api';
import { UserAvatar } from './UserAvatar';
import { usePWAInstall } from '../utils/usePWAInstall';
import { PWAInstallGuideModal } from './PWAInstallGuideModal';

export const ProfileView: React.FC = () => {
  const {
    currentUser,
    bookings,
    logout,
    setActiveTab,
    setIsAuthModalOpen,
    setSelectedTurf,
    setBookingTurf,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
  } = useApp();

  // Active section tab
  const [profileTab, setProfileTab] = useState<'overview' | 'edit' | 'security' | 'favorites'>('overview');

  // Edit Profile form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('Dhaka, Bangladesh');
  const [avatar, setAvatar] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Phone Verification OTP Modal State
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [verifyPhoneInput, setVerifyPhoneInput] = useState('');
  const [verifyOtpCode, setVerifyOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Email Verification Resend State
  const [emailResendLoading, setEmailResendLoading] = useState(false);
  const [emailResendSuccess, setEmailResendSuccess] = useState<string | null>(null);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Favorites State
  const [favoriteTurfs, setFavoriteTurfs] = useState<Turf[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  // PWA Installation Hook
  const { canShowInstallPrompt, isInstalled, isInstallable: isPWAInstallable, install: triggerPWAInstall, platform: pwaPlatform } = usePWAInstall();
  const [isPWAGuideOpen, setIsPWAGuideOpen] = useState(false);

  // Initialize form when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setLocation(currentUser.location || 'Dhaka, Bangladesh');
      setAvatar(currentUser.avatar || '');
      setVerifyPhoneInput(currentUser.phone || '');
    }
  }, [currentUser]);

  // Load favorite turfs when on favorites tab
  useEffect(() => {
    if (profileTab === 'favorites' && currentUser) {
      loadFavorites();
    }
  }, [profileTab, currentUser]);

  // OTP Countdown timer
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const loadFavorites = async () => {
    setLoadingFavorites(true);
    try {
      const turfsList = await api.getFavoriteTurfs();
      setFavoriteTurfs(turfsList);
    } catch (err) {
      console.error('Failed to load favorite turfs:', err);
    } finally {
      setLoadingFavorites(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4 text-[#0FA958] shadow-card">
          <UserIcon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#0F172A] mb-2">Sign in to your TurfBD Account</h2>
        <p className="text-sm text-[#64748B] max-w-sm mb-6">
          Access your match history, manage upcoming turf bookings, and get real-time game confirmations.
        </p>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="px-6 py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl shadow-soft transition-all cursor-pointer"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  // Calculate customer stats
  const userBookings = bookings.filter((b) => b.userId === currentUser.id);
  const confirmedCount = userBookings.filter((b) => b.status === 'confirmed').length;
  const pendingCount = userBookings.filter((b) => b.status === 'pending_approval').length;
  const totalSpent = userBookings.reduce((sum, b) => sum + (b.advancePaid || 0), 0);

  // Handle Avatar Image File Upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/i)) {
      setAvatarMessage({ type: 'error', text: 'Please select a valid image file (JPG, PNG, or WebP).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarMessage({ type: 'error', text: 'Image size exceeds the 5MB maximum limit.' });
      return;
    }

    setAvatarUploading(true);
    setAvatarMessage(null);
    try {
      const newImageUrl = await uploadAvatar(file);
      setAvatar(newImageUrl);
      setAvatarMessage({ type: 'success', text: 'Profile photo uploaded successfully!' });
      setTimeout(() => setAvatarMessage(null), 4000);
    } catch (err: any) {
      setAvatarMessage({ type: 'error', text: err.message || 'Failed to upload profile photo' });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Remove Avatar
  const handleRemoveAvatar = async () => {
    setAvatarUploading(true);
    setAvatarMessage(null);
    try {
      await deleteAvatar();
      setAvatar('');
      setAvatarMessage({ type: 'success', text: 'Profile photo removed. Initial avatar restored.' });
      setTimeout(() => setAvatarMessage(null), 4000);
    } catch (err: any) {
      setAvatarMessage({ type: 'error', text: err.message || 'Failed to remove profile photo' });
    } finally {
      setAvatarUploading(false);
    }
  };

  // Submit Profile Changes
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditMessage(null);

    try {
      await updateProfile({
        name,
        phone,
        location,
        profileImage: avatar || undefined,
      });

      setEditMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setEditMessage(null), 4000);
    } catch (err: any) {
      setEditMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setEditLoading(false);
    }
  };

  // Submit Password Change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setPasswordLoading(true);
    try {
      const message = await api.changePassword(currentPassword, newPassword);
      setPasswordMessage({ type: 'success', text: message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(null), 4000);
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Resend Email Verification
  const handleResendEmail = async () => {
    setEmailResendLoading(true);
    setEmailResendSuccess(null);
    try {
      const res = await api.resendEmailVerification(currentUser.email);
      setEmailResendSuccess(res.message);
      setTimeout(() => setEmailResendSuccess(null), 6000);
    } catch (err: any) {
      setEmailResendSuccess(err.message || 'Failed to send verification email');
    } finally {
      setEmailResendLoading(false);
    }
  };

  // Open Phone Verification Modal
  const openPhoneVerification = () => {
    setVerifyPhoneInput(currentUser.phone || '');
    setVerifyOtpCode('');
    setOtpSent(false);
    setOtpError('');
    setIsPhoneModalOpen(true);
  };

  // Send Phone OTP
  const handleSendPhoneOtp = async () => {
    setOtpLoading(true);
    setOtpError('');
    try {
      await api.sendPhoneVerification(verifyPhoneInput);
      setOtpSent(true);
      setOtpTimer(60);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to send verification code');
    } finally {
      setOtpLoading(false);
    }
  };

  // Confirm Phone OTP
  const handleConfirmPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError('');
    try {
      const updatedUser = await api.confirmPhoneVerification(verifyPhoneInput, verifyOtpCode);
      Object.assign(currentUser, updatedUser);
      setIsPhoneModalOpen(false);
      setEditMessage({ type: 'success', text: 'Phone number verified successfully!' });
    } catch (err: any) {
      setOtpError(err.message || 'Failed to verify code');
    } finally {
      setOtpLoading(false);
    }
  };

  // Toggle favorite turf
  const handleToggleFavorite = async (turfId: string) => {
    try {
      await api.toggleFavoriteTurf(turfId);
      setFavoriteTurfs((prev) => prev.filter((t) => t.id !== turfId));
    } catch (err) {
      console.error('Failed to unfavorite:', err);
    }
  };

  return (
    <div id="turfbd-profile-view" className="max-w-2xl mx-auto px-4 py-6 md:py-10 pb-28">
      {/* Header Profile Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card relative overflow-hidden mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="relative">
            <UserAvatar
              name={currentUser.name}
              avatar={currentUser.avatar}
              size="xl"
              shape="rounded"
              className="border-2 border-emerald-200 shadow-sm"
            />
            <span className="absolute -bottom-1 -right-1 bg-[#0FA958] text-white p-1 rounded-full border-2 border-white shadow">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-black text-[#0F172A]">{currentUser.name}</h1>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-[#064E3B] border border-emerald-200">
                    {currentUser.role === 'admin' ? 'Super Admin' : currentUser.role === 'owner' ? 'Turf Owner' : 'Player / Customer'}
                  </span>
                  <span className="text-xs text-[#64748B] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#0FA958]" />
                    {currentUser.location || 'Dhaka, Bangladesh'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => logout()}
                className="self-center sm:self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#64748B] hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </div>

            {/* Contact details with verification badges */}
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <Phone className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                  <span className="truncate">{currentUser.phone}</span>
                </div>
                {currentUser.isPhoneVerified ? (
                  <span className="inline-flex items-center text-[10px] text-[#064E3B] font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 text-[#0FA958]" /> Verified
                  </span>
                ) : (
                  <button
                    onClick={openPhoneVerification}
                    className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition-colors shrink-0 cursor-pointer"
                  >
                    Verify SMS
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                  <span className="truncate">{currentUser.email}</span>
                </div>
                {currentUser.isEmailVerified ? (
                  <span className="inline-flex items-center text-[10px] text-[#064E3B] font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 text-[#0FA958]" /> Verified
                  </span>
                ) : (
                  <button
                    onClick={handleResendEmail}
                    disabled={emailResendLoading}
                    className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {emailResendLoading ? 'Sending...' : 'Verify Email'}
                  </button>
                )}
              </div>
            </div>

            {emailResendSuccess && (
              <div className="mt-3 text-[11px] text-[#064E3B] bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                {emailResendSuccess}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Section Navigation Tabs */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto scrollbar-none gap-2">
        <button
          onClick={() => setProfileTab('overview')}
          className={`pb-3 px-3 text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 cursor-pointer ${
            profileTab === 'overview'
              ? 'border-[#0FA958] text-[#064E3B]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          Overview &amp; Stats
        </button>

        <button
          onClick={() => setProfileTab('edit')}
          className={`pb-3 px-3 text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 cursor-pointer ${
            profileTab === 'edit'
              ? 'border-[#0FA958] text-[#064E3B]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          Edit Profile
        </button>

        <button
          onClick={() => setProfileTab('favorites')}
          className={`pb-3 px-3 text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 cursor-pointer ${
            profileTab === 'favorites'
              ? 'border-[#0FA958] text-[#064E3B]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          Saved Turfs
        </button>

        <button
          onClick={() => setProfileTab('security')}
          className={`pb-3 px-3 text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 cursor-pointer ${
            profileTab === 'security'
              ? 'border-[#0FA958] text-[#064E3B]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          Password &amp; Security
        </button>
      </div>

      {/* TAB 1: OVERVIEW & STATS */}
      {profileTab === 'overview' && (
        <>
          {/* Booking & Financial Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-center shadow-card">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#0FA958] mx-auto flex items-center justify-center mb-1.5">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="text-lg font-black text-[#0F172A]">{confirmedCount}</div>
              <div className="text-[11px] text-[#64748B] font-medium">Matches Played</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-center shadow-card">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-1.5">
                <CalendarCheck2 className="w-4 h-4" />
              </div>
              <div className="text-lg font-black text-[#0F172A]">{pendingCount}</div>
              <div className="text-[11px] text-[#64748B] font-medium">Upcoming</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-center shadow-card">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#064E3B] mx-auto flex items-center justify-center mb-1.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-lg font-black text-[#064E3B]">BDT {totalSpent.toLocaleString()}</div>
              <div className="text-[11px] text-[#64748B] font-medium">Total Paid</div>
            </div>
          </div>

          {/* Navigation Quick Links */}
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden mb-6 shadow-card">
            <button
              onClick={() => setActiveTab('my-bookings')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-[#0FA958]">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0F172A]">My Bookings &amp; Match Passes</div>
                  <div className="text-xs text-[#64748B]">View printable receipts, QR codes &amp; vouchers</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Turf Owner Portal shortcut (Only for verified Owner/Admin) */}
            {(currentUser.role === 'owner' || currentUser.role === 'admin') && (
              <button
                onClick={() => setActiveTab('owner-dashboard')}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-[#0FA958]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#0F172A]">Turf Owner Dashboard</div>
                    <div className="text-xs text-[#64748B]">Manage time slots, block hours, view turf revenue</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            )}

            {/* Super Admin Panel shortcut (Only for verified Super Admin) */}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin-panel')}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#0F172A]">Platform Administration</div>
                    <div className="text-xs text-[#64748B]">Review venues, audit payments &amp; platform settings</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            )}
            {/* PWA Install Quick Action (Hidden if already installed or inside Electron/native wrapper) */}
            {canShowInstallPrompt && (
              <button
                onClick={async () => {
                  if (isPWAInstallable) {
                    const res = await triggerPWAInstall();
                    if (res.outcome === 'manual') setIsPWAGuideOpen(true);
                  } else {
                    setIsPWAGuideOpen(true);
                  }
                }}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
                id="profile-install-pwa-btn"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-[#0FA958]">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                      <span>Install TurfBD App</span>
                      <span className="text-[10px] font-bold text-[#064E3B] bg-emerald-100 px-2 py-0.5 rounded-full font-mono">
                        PWA
                      </span>
                    </div>
                    <div className="text-xs text-[#64748B]">
                      Add to your device home screen for instant booking and offline access
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            )}

            {/* Already Installed Status Feedback */}
            {isInstalled && (
              <div
                id="profile-pwa-installed-badge"
                className="w-full px-4 py-3 flex items-center justify-between bg-emerald-50/70 border-b border-emerald-100/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-[#0FA958]">
                    <CheckCircle2 className="w-4 h-4 text-[#0FA958]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#064E3B]">
                      TurfBD App Installed
                    </div>
                    <div className="text-[11px] text-emerald-700/80">
                      Running in standalone application mode
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: EDIT PROFILE */}
      {profileTab === 'edit' && (
        <form onSubmit={handleProfileUpdate} className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 space-y-4 shadow-card">
          <h3 className="text-sm font-bold text-[#0F172A] mb-2">Edit Account Information</h3>

          {editMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                editMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-[#064E3B]'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {editMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0FA958]" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
              <span>{editMessage.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number (Bangladesh)</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="+8801700000000"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
              />
            </div>
            <p className="text-[10px] text-[#64748B] mt-1">Changing your phone number will require SMS OTP re-verification.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">City / Region</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Dhaka, Bangladesh"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
              />
            </div>
          </div>

          {/* Profile Photo Management */}
          <div className="pt-2 pb-1 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Profile Photo</label>

            {avatarMessage && (
              <div
                className={`mb-3 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  avatarMessage.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-[#064E3B]'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {avatarMessage.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0FA958] shrink-0" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
                )}
                <span>{avatarMessage.text}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="relative shrink-0">
                <UserAvatar
                  name={name || currentUser.name}
                  avatar={avatar || currentUser.avatar}
                  size="xl"
                  shape="rounded"
                  className="border-2 border-emerald-300 shadow-sm"
                />
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {avatar || currentUser.avatar ? 'Custom Profile Photo' : 'Default Initials Avatar'}
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    JPG, PNG, or WebP up to 5MB. If removed, your initials are shown.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                    id="profile-avatar-file-input"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0FA958] hover:bg-[#0D944D] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{avatarUploading ? 'Uploading...' : 'Upload Photo'}</span>
                  </button>

                  {(avatar || currentUser.avatar) && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={avatarUploading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Remove Photo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={editLoading}
              className="w-full py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs transition-colors shadow-soft cursor-pointer disabled:opacity-50"
            >
              {editLoading ? 'Saving Profile...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: SAVED FAVORITE TURFS */}
      {profileTab === 'favorites' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#0F172A]">Your Favorite Venues</h3>
            <span className="text-xs text-[#64748B]">{favoriteTurfs.length} saved</span>
          </div>

          {loadingFavorites ? (
            <div className="py-8 text-center text-xs text-[#64748B] flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0FA958]" /> Loading saved turfs...
            </div>
          ) : favoriteTurfs.length === 0 ? (
            <div className="py-8 text-center">
              <Heart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-[#64748B]">You haven't bookmarked any turfs yet.</p>
              <button
                onClick={() => setActiveTab('explore')}
                className="mt-3 px-4 py-2 bg-emerald-50 text-[#064E3B] hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Explore Turfs in Dhaka
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {favoriteTurfs.map((turf) => (
                <div
                  key={turf.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                >
                  <img
                    src={turf.images[0] || 'https://images.unsplash.com/photo-1529900240051-06c3ad5e6375?auto=format&fit=crop&w=200&q=80'}
                    alt={turf.name}
                    className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-[#0F172A] truncate">{turf.name}</h4>
                    <p className="text-[11px] text-[#64748B] truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#0FA958] shrink-0" />
                      {turf.location.area}, {turf.location.city}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        {turf.rating.average}
                      </span>
                      <span className="text-[10px] text-[#64748B]">• BDT {turf.pricing.hourlyRate}/hr</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedTurf(turf);
                        setBookingTurf(turf);
                      }}
                      className="px-3 py-1.5 bg-[#0FA958] hover:bg-[#0D944D] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                    >
                      Book
                    </button>
                    <button
                      onClick={() => handleToggleFavorite(turf.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove from favorites"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PASSWORD & SECURITY */}
      {profileTab === 'security' && (
        <div className="space-y-6">
          {/* Change Password Form */}
          <form onSubmit={handlePasswordChange} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-card">
            <h3 className="text-sm font-bold text-[#0F172A] mb-1">Update Security Password</h3>
            <p className="text-xs text-[#64748B]">
              Ensure your account is protected with a strong cryptographic password.
            </p>

            {passwordMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  passwordMessage.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-[#064E3B]'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {passwordMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0FA958]" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
                />
              </div>
              <p className="text-[10px] text-[#64748B] mt-1">
                Password policy: 8+ characters, including at least 1 uppercase letter and 1 numeric digit.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs transition-colors shadow-soft cursor-pointer disabled:opacity-50"
              >
                {passwordLoading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </div>
          </form>

          {/* Connected Social Accounts & Sessions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-card">
            <h3 className="text-sm font-bold text-[#0F172A]">Connected Accounts &amp; Identity</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                    <path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.9 6.4C.7 8.8 0 10.3 0 12s.7 3.2 1.9 5.6l3.7-2.9z" />
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.2 7.5 23 12 23z" />
                  </svg>
                  <div>
                    <div className="font-semibold text-[#0F172A]">Google OAuth</div>
                    <div className="text-[10px] text-[#64748B]">
                      {currentUser.googleId ? `Connected (ID: ${currentUser.googleId.slice(0, 10)}...)` : 'Not linked'}
                    </div>
                  </div>
                </div>
                {currentUser.googleId ? (
                  <span className="text-[10px] text-[#064E3B] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">Linked</span>
                ) : (
                  <span className="text-[10px] text-[#64748B]">Available</span>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <div>
                    <div className="font-semibold text-[#0F172A]">Facebook Login</div>
                    <div className="text-[10px] text-[#64748B]">
                      {currentUser.facebookId ? `Connected (ID: ${currentUser.facebookId.slice(0, 10)}...)` : 'Not linked'}
                    </div>
                  </div>
                </div>
                {currentUser.facebookId ? (
                  <span className="text-[10px] text-[#064E3B] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">Linked</span>
                ) : (
                  <span className="text-[10px] text-[#64748B]">Available</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHONE VERIFICATION OTP MODAL */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setIsPhoneModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0FA958] flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">Verify Mobile Number</h3>
            </div>

            <p className="text-xs text-[#64748B] mb-4">
              We'll send a 6-digit cryptographic OTP to your Bangladesh phone number via SMS gateway.
            </p>

            {otpError && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                {otpError}
              </div>
            )}

            {!otpSent ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bangladesh Number</label>
                  <input
                    type="tel"
                    value={verifyPhoneInput}
                    onChange={(e) => setVerifyPhoneInput(e.target.value)}
                    placeholder="+8801700000000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-[#0F172A] focus:outline-none focus:border-[#0FA958] focus:bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendPhoneOtp}
                  disabled={otpLoading || !verifyPhoneInput}
                  className="w-full py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-soft"
                >
                  {otpLoading ? 'Sending SMS...' : 'Send Verification OTP'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmPhoneOtp} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={verifyOtpCode}
                    onChange={(e) => setVerifyOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-center tracking-widest font-mono text-sm text-[#0F172A] focus:outline-none focus:border-[#0FA958] focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                  <span>Sent to {verifyPhoneInput}</span>
                  {otpTimer > 0 ? (
                    <span>Resend in {otpTimer}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendPhoneOtp}
                      disabled={otpLoading}
                      className="text-[#0FA958] hover:underline cursor-pointer"
                    >
                      Resend Code
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={otpLoading || verifyOtpCode.length !== 6}
                  className="w-full py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-soft"
                >
                  {otpLoading ? 'Verifying...' : 'Confirm Verification'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Support and Hotline Note */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-[#64748B] flex items-start gap-3 shadow-card">
        <HelpCircle className="w-4 h-4 text-[#0FA958] shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-[#0F172A]">Need help with your account or turf booking?</p>
          <p className="mt-0.5">
            Contact TurfBD Bangladesh 24/7 hotline at <strong className="text-[#064E3B]">+880 1912-334455</strong> or email <strong className="text-[#064E3B]">support@turfbd.com</strong>.
          </p>
        </div>
      </div>

      {/* PWA Cross-Device Install Guide Modal (Desktop Only) */}
      {isPWAGuideOpen && canShowInstallPrompt && (
        <PWAInstallGuideModal
          isOpen={isPWAGuideOpen}
          onClose={() => setIsPWAGuideOpen(false)}
          defaultPlatform={pwaPlatform}
        />
      )}
    </div>
  );
};
