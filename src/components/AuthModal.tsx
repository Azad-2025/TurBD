import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TurfBDLogo } from './TurfBDLogo';
import { X, User, Building2, Mail, Lock, Phone, KeyRound, Smartphone, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { UserRole } from '../types';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authMode,
    setAuthMode,
    login,
    register,
    sendPhoneOtp,
    loginWithPhoneOtp,
    loginWithSocial,
    forgotPassword,
    resetPassword,
  } = useApp();

  // Sub-modes: 'email' | 'phone_otp' | 'forgot_password' | 'reset_password'
  const [activeMethod, setActiveMethod] = useState<'email' | 'phone_otp' | 'forgot_password'>('email');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('player');

  // Phone OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Forgot / Reset Password States
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // OAuth feature flags (Explicitly false by default across Preview & Production)
  const isGoogleOAuthEnabled = import.meta.env.VITE_ENABLE_GOOGLE_OAUTH === 'true';
  const isFacebookOAuthEnabled = import.meta.env.VITE_ENABLE_FACEBOOK_OAUTH === 'true';
  const showSocialLogin = (isGoogleOAuthEnabled || isFacebookOAuthEnabled) && activeMethod !== 'forgot_password';

  // Countdown timer for OTP
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // Listen for OAuth failure/cancellation events dispatched by popup
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setError(event.data.error || 'Social authentication was cancelled or failed.');
        setLoading(false);
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  // Handle Social Login (Google & Facebook)
  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await loginWithSocial(provider);
    } catch (err: any) {
      setError(err?.message || `Failed to initiate ${provider} login.`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthModalOpen) return null;

  // Handle Standard Email Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid email or password. Please verify your credentials or reset your password.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Standard Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!name || !email || !phone) {
      setError('Please fill in all required fields');
      return;
    }
    if (password && password.length < 8) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and a number.');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, phone, selectedRole, password);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Send Phone OTP
  const handleSendOtp = async () => {
    setError('');
    setSuccessMsg('');
    if (!phone) {
      setError('Please enter a valid Bangladesh phone number (+880 or 01...)');
      return;
    }
    setLoading(true);
    try {
      const res = await sendPhoneOtp(phone);
      setOtpSent(true);
      setOtpCountdown(60);
      setSuccessMsg(res.message || 'OTP verification code sent!');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please check the number.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify Phone OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    try {
      await loginWithPhoneOtp(phone, otpCode, name, selectedRole);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password Request
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!forgotEmail) {
      setError('Please enter your account email');
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPassword(forgotEmail);
      setSuccessMsg(res.message);
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setResetStep('reset');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Reset Submission
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!resetToken || !newPassword) {
      setError('Reset token and new password are required');
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(resetToken, newPassword);
      setSuccessMsg(res.message);
      setTimeout(() => {
        setActiveMethod('email');
        setResetStep('request');
        setPassword(newPassword);
        if (forgotEmail) setEmail(forgotEmail);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      id="auth-modal"
    >
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          id="auth-modal-close-btn"
          aria-label="Close authentication dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <TurfBDLogo
              layout="icon"
              size="sm"
              variant="light"
              id="auth-modal-logo"
            />
            <h2 className="text-xl font-bold text-[#0F172A]">
              {activeMethod === 'forgot_password'
                ? 'Reset Password'
                : authMode === 'signin'
                ? 'Sign In to TurfBD'
                : 'Create TurfBD Account'}
            </h2>
          </div>
          <p className="text-xs text-[#64748B]">
            {activeMethod === 'forgot_password'
              ? 'Enter your registered email to receive reset instructions.'
              : authMode === 'signin'
              ? 'Access real-time slot bookings, field passes, and arena management.'
              : 'Join Bangladesh’s sports community as a Player or Turf Owner.'}
          </p>
        </div>

        {/* Primary Tab Switcher (Sign In vs Register) */}
        {activeMethod !== 'forgot_password' && (
          <div className="flex bg-slate-100 p-1 rounded-xl mb-4 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setError('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'signin'
                  ? 'bg-white text-[#0F172A] shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              id="auth-tab-signin"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setError('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'signup'
                  ? 'bg-white text-[#0F172A] shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              id="auth-tab-signup"
            >
              Register
            </button>
          </div>
        )}

        {/* Sub-tab Switcher: Email vs Phone OTP */}
        {activeMethod !== 'forgot_password' && (
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setActiveMethod('email');
                setError('');
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeMethod === 'email'
                  ? 'bg-emerald-50 border-emerald-300 text-[#064E3B] shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-[#0FA958]" />
              Email &amp; Password
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMethod('phone_otp');
                setError('');
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeMethod === 'phone_otp'
                  ? 'bg-emerald-50 border-emerald-300 text-[#064E3B] shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-[#0FA958]" />
              Phone OTP (+880)
            </button>
          </div>
        )}

        {/* Feedback Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-[#064E3B] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#0FA958]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* VIEW 1: FORGOT / RESET PASSWORD */}
        {activeMethod === 'forgot_password' ? (
          <div className="space-y-4">
            {resetStep === 'request' ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. tanvir@turfbd.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs transition-colors shadow-soft cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Sending Instructions...' : 'Send Password Reset Link'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reset Token</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Paste reset token from email"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-[#0F172A] font-mono placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
                      required
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
                      placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-[#64748B] mt-1">
                    Requirements: 8+ chars, uppercase (A-Z), lowercase (a-z), and number (0-9)
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs transition-colors shadow-soft cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setActiveMethod('email');
                setError('');
                setSuccessMsg('');
              }}
              className="w-full text-center text-xs text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              ← Back to Sign In
            </button>
          </div>
        ) : activeMethod === 'phone_otp' ? (
          /* VIEW 2: PHONE OTP AUTHENTICATION */
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bangladesh Mobile Number (+880)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-xs font-semibold text-slate-500">+880</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="1711234567"
                    disabled={otpSent && otpCountdown > 0}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-13 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white disabled:opacity-60"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || (otpSent && otpCountdown > 0)}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-[#064E3B] border border-slate-200 font-semibold rounded-xl text-xs whitespace-nowrap transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {otpCountdown > 0 ? (
                    <span>{otpCountdown}s</span>
                  ) : (
                    <>
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      {otpSent ? 'Resend' : 'Send OTP'}
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-[#64748B] mt-1">
                Supports Grameenphone, Banglalink, Robi, Airtel, and Teletalk.
              </p>
            </div>

            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name (Optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Asif Iqbal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
                />
              </div>
            )}

            {otpSent && (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm tracking-widest text-center font-mono text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs transition-colors shadow-soft cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify OTP & Continue'}
                </button>
              </form>
            )}
          </div>
        ) : authMode === 'signin' ? (
          /* VIEW 3: STANDARD EMAIL SIGN IN */
          <form onSubmit={handleSignIn} className="space-y-3.5" id="signin-form">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. tanvir@turfbd.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
                  required
                  id="signin-email-input"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMethod('forgot_password');
                    setForgotEmail(email);
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="text-[11px] text-[#0FA958] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
                  required
                  id="signin-password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs transition-colors shadow-soft cursor-pointer disabled:opacity-50"
              id="signin-submit-btn"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        ) : (
          /* VIEW 4: STANDARD REGISTRATION */
          <form onSubmit={handleSignUp} className="space-y-3.5" id="signup-form">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Role</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('player')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedRole === 'player'
                      ? 'bg-emerald-50 border-emerald-300 text-[#064E3B] shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#0FA958]" />
                    Player / Team
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">Book turf slots</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('owner')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedRole === 'owner'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    Turf Owner
                  </div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">List arena &amp; earn</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Asif Iqbal"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
                required
                id="signup-name-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="asif@gmail.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
                required
                id="signup-email-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (bKash/SMS)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-semibold text-slate-500">+880</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="1711234567"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-13 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
                  required
                  id="signup-phone-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars (Uppercase, lowercase, number)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
                  required
                  id="signup-password-input"
                />
              </div>
              <p className="text-[10px] text-[#64748B] mt-1">
                Password policy: Minimum 8 characters with at least 1 uppercase letter and 1 number.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs transition-colors shadow-soft cursor-pointer disabled:opacity-50"
              id="signup-submit-btn"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* Social Login (Google & Facebook OAuth - Explicitly hidden when disabled via feature flags) */}
        {showSocialLogin && (
          <div className="mt-4 pt-4 border-t border-slate-100" id="social-login-container">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] text-center mb-2.5">
              Or Continue With
            </p>
            <div className={`grid ${isGoogleOAuthEnabled && isFacebookOAuthEnabled ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
              {isGoogleOAuthEnabled && (
                <button
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  disabled={loading}
                  className="py-2 px-3 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 border border-slate-200 rounded-xl text-xs text-[#0F172A] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  id="social-login-google"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.9 6.4C.7 8.8 0 10.3 0 12s.7 3.2 1.9 5.6l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.2 7.5 23 12 23z"
                    />
                  </svg>
                  Google
                </button>
              )}

              {isFacebookOAuthEnabled && (
                <button
                  type="button"
                  onClick={() => handleSocialLogin('facebook')}
                  disabled={loading}
                  className="py-2 px-3 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 border border-slate-200 rounded-xl text-xs text-[#0F172A] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  id="social-login-facebook"
                >
                  <svg className="w-4 h-4" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
