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
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('01711234567');
  const [selectedRole, setSelectedRole] = useState<UserRole>('player');

  // Phone OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [demoCodeNotice, setDemoCodeNotice] = useState<string | null>(null);

  // Forgot / Reset Password States
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Countdown timer for OTP
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

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
        setError('Invalid email or password. Try one of the demo accounts below or reset password.');
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
      if (res.demoCode) {
        setDemoCodeNotice(res.demoCode);
      }
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

  const handleQuickLogin = (demoEmail: string, role: UserRole) => {
    login(demoEmail, 'password123');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      id="auth-modal"
    >
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          id="auth-modal-close-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <TurfBDLogo
              layout="icon"
              size="sm"
              variant="dark"
              id="auth-modal-logo"
            />
            <h2 className="text-xl font-bold text-white">
              {activeMethod === 'forgot_password'
                ? 'Reset Password'
                : authMode === 'signin'
                ? 'Sign In to TurfBD'
                : 'Create TurfBD Account'}
            </h2>
          </div>
          <p className="text-xs text-neutral-400">
            {activeMethod === 'forgot_password'
              ? 'Enter your registered email to receive reset instructions.'
              : authMode === 'signin'
              ? 'Access real-time slot bookings, field passes, and arena management.'
              : 'Join Bangladesh’s sports community as a Player or Turf Owner.'}
          </p>
        </div>

        {/* Primary Tab Switcher (Sign In vs Register) */}
        {activeMethod !== 'forgot_password' && (
          <div className="flex bg-neutral-800/80 p-1 rounded-xl mb-4 border border-neutral-700/50">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setError('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                authMode === 'signin'
                  ? 'bg-neutral-700 text-white shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
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
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                authMode === 'signup'
                  ? 'bg-neutral-700 text-white shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
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
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                activeMethod === 'email'
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                  : 'bg-neutral-800/40 border-neutral-700/40 text-neutral-400 hover:text-neutral-300'
              }`}
            >
              <Mail className="w-3 h-3" />
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMethod('phone_otp');
                setError('');
              }}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                activeMethod === 'phone_otp'
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                  : 'bg-neutral-800/40 border-neutral-700/40 text-neutral-400 hover:text-neutral-300'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              Phone OTP (+880)
            </button>
          </div>
        )}

        {/* Feedback Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Demo OTP Helper Banner */}
        {demoCodeNotice && activeMethod === 'phone_otp' && (
          <div className="mb-4 p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-neutral-200 flex items-center justify-between">
            <div>
              <span className="text-emerald-400 font-semibold">SMS Simulated OTP: </span>
              <span className="font-mono text-white font-bold bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700">
                {demoCodeNotice}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOtpCode(demoCodeNotice)}
              className="text-[10px] text-emerald-400 hover:underline font-bold cursor-pointer"
            >
              Auto-Fill
            </button>
          </div>
        )}

        {/* VIEW 1: FORGOT / RESET PASSWORD */}
        {activeMethod === 'forgot_password' ? (
          <div className="space-y-4">
            {resetStep === 'request' ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. tanvir@turfbd.com"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Sending Instructions...' : 'Send Password Reset Link'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Reset Token</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                    <input
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Paste reset token from email"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-2 pl-9 pr-3 text-xs text-white font-mono placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Requirements: 8+ chars, uppercase (A-Z), lowercase (a-z), and number (0-9)
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
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
              className="w-full text-center text-xs text-neutral-400 hover:text-white transition-colors"
            >
              ← Back to Sign In
            </button>
          </div>
        ) : activeMethod === 'phone_otp' ? (
          /* VIEW 2: PHONE OTP AUTHENTICATION */
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Bangladesh Mobile Number (+880)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-xs font-semibold text-neutral-500">+880</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="1711234567"
                    disabled={otpSent && otpCountdown > 0}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-2 pl-13 pr-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || (otpSent && otpCountdown > 0)}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-neutral-700 font-semibold rounded-xl text-xs whitespace-nowrap transition-colors disabled:opacity-50 flex items-center gap-1.5"
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
              <p className="text-[10px] text-neutral-500 mt-1">
                Supports Grameenphone, Banglalink, Robi, Airtel, and Teletalk.
              </p>
            </div>

            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Your Name (Optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Asif Iqbal"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {otpSent && (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-2 px-3 text-sm tracking-widest text-center font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
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
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. tanvir@turfbd.com"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  required
                  id="signin-email-input"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMethod('forgot_password');
                    setForgotEmail(email);
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  required
                  id="signin-password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              id="signin-submit-btn"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        ) : (
          /* VIEW 4: STANDARD REGISTRATION */
          <form onSubmit={handleSignUp} className="space-y-3.5" id="signup-form">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Account Role</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('player')}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    selectedRole === 'player'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-750'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Player / Team
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Book turf slots</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('owner')}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    selectedRole === 'owner'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-750'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Turf Owner
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">List arena & earn</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Asif Iqbal"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                required
                id="signup-name-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="asif@gmail.com"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                required
                id="signup-email-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Phone Number (bKash/SMS)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-semibold text-neutral-500">+880</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="1711234567"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-2 pl-13 pr-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  required
                  id="signup-phone-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars (Uppercase, lowercase, number)"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  required
                  id="signup-password-input"
                />
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                Password policy: Minimum 8 characters with at least 1 uppercase letter and 1 number.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              id="signup-submit-btn"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* Social Login (Google & Facebook OAuth) */}
        {activeMethod !== 'forgot_password' && (
          <div className="mt-4 pt-4 border-t border-neutral-800/80">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 text-center mb-2.5">
              Or Continue With
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => loginWithSocial('google')}
                className="py-2 px-3 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-xl text-xs text-white font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
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

              <button
                type="button"
                onClick={() => loginWithSocial('facebook')}
                className="py-2 px-3 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-xl text-xs text-white font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                id="social-login-facebook"
              >
                <svg className="w-4 h-4" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>
            </div>
          </div>
        )}

        {/* 1-Click Fast Demo Accounts */}
        <div className="mt-5 pt-4 border-t border-neutral-800">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 text-center mb-2.5">
            Quick 1-Click Demo Accounts
          </p>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('tanvir@turfbd.com', 'player')}
              className="w-full p-2 bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 rounded-xl flex items-center justify-between text-xs text-neutral-300 transition-colors"
              id="quick-login-player"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">⚽</span>
                <span className="font-semibold text-white">Tanvir Ahmed</span>
                <span className="text-[10px] text-neutral-400">(Player)</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                Log In
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('owner@gulshanarena.com', 'owner')}
              className="w-full p-2 bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 rounded-xl flex items-center justify-between text-xs text-neutral-300 transition-colors"
              id="quick-login-owner"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]">🏟️</span>
                <span className="font-semibold text-white">Rafiqul Islam</span>
                <span className="text-[10px] text-neutral-400">(Turf Owner)</span>
              </div>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                Log In
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin@turfbd.com', 'admin')}
              className="w-full p-2 bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 rounded-xl flex items-center justify-between text-xs text-neutral-300 transition-colors"
              id="quick-login-admin"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px]">🛡️</span>
                <span className="font-semibold text-white">Shahriar Kabir</span>
                <span className="text-[10px] text-neutral-400">(Super Admin)</span>
              </div>
              <span className="text-[10px] font-bold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60">
                Log In
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
