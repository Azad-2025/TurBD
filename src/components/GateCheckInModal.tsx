import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Scan,
  Keyboard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  Building2,
  RefreshCw,
  X,
  Camera,
  CameraOff,
  Search,
  Sparkles,
  ArrowRight,
  DollarSign,
  AlertOctagon,
} from 'lucide-react';
import { api } from '../services/api';
import { Turf, Booking } from '../types';
import { TurfBDLogo } from './TurfBDLogo';

interface GateCheckInModalProps {
  turfs: Turf[];
  onClose: () => void;
  onCheckInComplete?: (booking: Booking) => void;
}

type CheckInState = 'idle' | 'verifying' | 'success' | 'already_checked_in' | 'rejected';

export const GateCheckInModal: React.FC<GateCheckInModalProps> = ({
  turfs,
  onClose,
  onCheckInComplete,
}) => {
  const [activeMode, setActiveMode] = useState<'qr' | 'manual'>('qr');
  const [selectedTurfId, setSelectedTurfId] = useState<string>(turfs[0]?.id || '');
  const [manualCode, setManualCode] = useState<string>('');
  const [state, setState] = useState<CheckInState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize or stop camera stream when tab changes
  useEffect(() => {
    if (activeMode === 'qr' && state === 'idle') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeMode, state]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
      } else {
        setCameraError('Camera access not supported by browser.');
      }
    } catch (err: any) {
      console.warn('Camera could not be opened:', err.message);
      setCameraError('Camera unavailable or permission denied. Please enter booking code manually.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Perform backend check-in call
  const handleVerify = async (inputData: string) => {
    if (!inputData.trim()) return;
    setState('verifying');
    setErrorMessage('');
    setVerificationResult(null);
    stopCamera();

    try {
      const res = await api.verifyPass(inputData, selectedTurfId || undefined, 'checkin');
      setVerificationResult(res);
      setState('success');
      if (onCheckInComplete && res.booking) {
        onCheckInComplete(res.booking);
      }
    } catch (err: any) {
      console.error('Check-in error:', err);
      const data = err.data || {};

      if (err.status === 409 || data.alreadyCheckedIn) {
        setState('already_checked_in');
        setVerificationResult(data);
        setErrorMessage(data.error || 'This match pass was already checked in.');
      } else {
        setState('rejected');
        setVerificationResult(data);
        setErrorMessage(err.message || 'Pass verification rejected by server.');
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify(manualCode);
  };

  const handleReset = () => {
    setState('idle');
    setManualCode('');
    setVerificationResult(null);
    setErrorMessage('');
  };

  const selectedTurf = turfs.find((t) => t.id === selectedTurfId) || turfs[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#064E3B] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Match Pass Gate Check-In</h3>
              <p className="text-[11px] text-slate-500">
                Authorized reception verification for Turf Owners
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Venue Selector Bar */}
        <div className="p-3 px-6 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
            <Building2 className="w-3.5 h-3.5 text-[#0FA958]" />
            <span>Active Gate Venue:</span>
          </div>
          <select
            value={selectedTurfId}
            onChange={(e) => setSelectedTurfId(e.target.value)}
            disabled={state !== 'idle'}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-[#0F172A] text-xs focus:outline-none focus:ring-1 focus:ring-[#0FA958]"
          >
            {turfs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.city})
              </option>
            ))}
          </select>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {/* STATE: IDLE */}
          {state === 'idle' && (
            <div className="space-y-5">
              {/* Mode Tabs */}
              <div className="flex items-center p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveMode('qr')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeMode === 'qr'
                      ? 'bg-white text-[#0F172A] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Scan className="w-4 h-4 text-[#0FA958]" />
                  <span>Scan Match QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('manual')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeMode === 'manual'
                      ? 'bg-white text-[#0F172A] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Keyboard className="w-4 h-4 text-[#0FA958]" />
                  <span>Enter Booking Code</span>
                </button>
              </div>

              {/* Mode 1: QR Scanner */}
              {activeMode === 'qr' && (
                <div className="space-y-4">
                  <div className="relative w-full aspect-square max-w-xs mx-auto bg-slate-900 rounded-3xl overflow-hidden border-2 border-dashed border-emerald-500/50 flex flex-col items-center justify-center text-white shadow-inner">
                    {/* Live Video Preview if active */}
                    <video
                      ref={videoRef}
                      className={`absolute inset-0 w-full h-full object-cover ${
                        cameraActive ? 'opacity-100' : 'hidden'
                      }`}
                      playsInline
                      muted
                    />

                    {/* Scanner Framing Animation */}
                    <div className="relative z-10 w-48 h-48 border-2 border-white/40 rounded-2xl flex items-center justify-center">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#0FA958]" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#0FA958]" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#0FA958]" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#0FA958]" />

                      {/* Moving laser beam */}
                      <div className="absolute left-2 right-2 h-0.5 bg-[#0FA958] shadow-[0_0_8px_#0FA958] animate-pulse" />

                      <div className="text-center p-2 bg-slate-900/60 rounded-xl backdrop-blur-xs">
                        <QrCode className="w-8 h-8 text-[#0FA958] mx-auto mb-1 animate-bounce" />
                        <span className="text-[10px] font-mono tracking-wider">
                          AIM AT PLAYER QR
                        </span>
                      </div>
                    </div>

                    {cameraError && (
                      <div className="absolute bottom-2 inset-x-2 p-2 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl text-[10px] text-center">
                        {cameraError}
                      </div>
                    )}
                  </div>

                  {/* Manual Quick Scan Input for Test / Barcode Guns */}
                  <div className="pt-2 text-center space-y-2">
                    <p className="text-[11px] text-slate-500">
                      Using a physical barcode scanner or testing with code?
                    </p>
                    <div className="flex items-center gap-2 max-w-sm mx-auto">
                      <input
                        type="text"
                        placeholder="Scan or type code (e.g. TBD-XXXX)..."
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerify(manualCode)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#0FA958]"
                      />
                      <button
                        type="button"
                        onClick={() => handleVerify(manualCode)}
                        disabled={!manualCode.trim()}
                        className="px-4 py-2 bg-[#0FA958] hover:bg-[#064E3B] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 2: Manual Booking Code Fallback */}
              {activeMode === 'manual' && (
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Enter 4-Character Booking Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. TBD-7492 or 7492"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                        autoFocus
                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-base font-mono font-black tracking-widest text-[#0F172A] uppercase focus:outline-none focus:ring-2 focus:ring-[#0FA958]"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Found on player’s official match pass or SMS/WhatsApp booking receipt.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!manualCode.trim()}
                    className="w-full py-3 bg-[#0FA958] hover:bg-[#064E3B] disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Lookup &amp; Verify Match Pass</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* STATE: VERIFYING */}
          {state === 'verifying' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 text-[#0FA958] flex items-center justify-center border border-emerald-100">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#0F172A]">Verifying with Central Database...</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Checking booking legitimacy, payment confirmation, and check-in history.
                </p>
              </div>
            </div>
          )}

          {/* STATE: SUCCESS */}
          {state === 'success' && verificationResult && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Green Verified Header Banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0FA958] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs uppercase font-black tracking-wider text-[#064E3B]">
                      Match Pass Verified
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-[#064E3B] font-mono text-[10px] font-bold">
                      ENTRY GRANTED
                    </span>
                  </div>
                  <h4 className="text-base font-black text-[#0F172A]">
                    {verificationResult.booking?.userName || 'Player'}
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Checked in at{' '}
                    {new Date(verificationResult.checkedInAt || Date.now()).toLocaleTimeString(
                      'en-US',
                      { hour: '2-digit', minute: '2-digit' }
                    )}{' '}
                    by {verificationResult.checkedInByName || 'Turf Owner'}
                  </p>
                </div>
              </div>

              {/* Match Details Breakdown */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Booking Pass Code</span>
                  <span className="font-mono font-bold text-sm text-[#064E3B]">
                    #{verificationResult.booking?.bookingCode}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">
                      Arena / Venue
                    </span>
                    <span className="font-bold text-[#0F172A]">
                      {verificationResult.booking?.turfName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">
                      Match Schedule
                    </span>
                    <span className="font-bold text-[#0F172A]">
                      {verificationResult.booking?.bookingDate} (
                      {verificationResult.booking?.startTime} -{' '}
                      {verificationResult.booking?.endTime})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">
                      Phone Number
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {verificationResult.booking?.userPhone || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">
                      Payment Status
                    </span>
                    <span
                      className={`font-bold ${
                        verificationResult.booking?.dueAmount > 0
                          ? 'text-amber-700'
                          : 'text-[#0FA958]'
                      }`}
                    >
                      {verificationResult.booking?.dueAmount > 0
                        ? `Due BDT ${verificationResult.booking?.dueAmount.toLocaleString()}`
                        : 'Fully Paid (No Due)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action: Next Check-in */}
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3 bg-[#0FA958] hover:bg-[#064E3B] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Scan Next Player Pass</span>
              </button>
            </div>
          )}

          {/* STATE: ALREADY CHECKED IN (WARNING) */}
          {state === 'already_checked_in' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs uppercase font-black tracking-wider text-amber-900">
                      Duplicate Pass Warning
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono text-[10px] font-bold">
                      ALREADY USED
                    </span>
                  </div>
                  <h4 className="text-base font-black text-amber-950">
                    This match pass was already checked in!
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Check-in was already completed at{' '}
                    <strong>
                      {verificationResult?.checkedInAt
                        ? new Date(verificationResult.checkedInAt).toLocaleString('en-US', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : 'an earlier time'}
                    </strong>{' '}
                    by{' '}
                    <strong>{verificationResult?.checkedInByName || 'Authorized Staff'}</strong>.
                  </p>
                  <p className="text-[11px] text-amber-700 pt-1">
                    To prevent fraudulent pass sharing, another check-in cannot be issued.
                  </p>
                </div>
              </div>

              {verificationResult?.booking && (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Customer Registered</span>
                    <span className="font-bold text-[#0F172A]">
                      {verificationResult.booking.userName} ({verificationResult.booking.userPhone})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Booking Code</span>
                    <span className="font-mono font-bold text-[#0F172A]">
                      #{verificationResult.booking.bookingCode}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Return to Scanner</span>
              </button>
            </div>
          )}

          {/* STATE: REJECTED (CANCELLED / REFUNDED / WRONG TURF / NOT FOUND) */}
          {state === 'rejected' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-5 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <XCircle className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs uppercase font-black tracking-wider text-rose-800">
                      Entry Rejected
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 font-mono text-[10px] font-bold">
                      INVALID
                    </span>
                  </div>
                  <h4 className="text-base font-black text-rose-950">Pass Cannot Be Admitted</h4>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    {errorMessage ||
                      'The provided match pass is invalid, cancelled, or not authorized for this turf.'}
                  </p>
                </div>
              </div>

              {verificationResult?.booking && (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500">Booking Status</span>
                    <span className="font-bold uppercase text-rose-600">
                      {verificationResult.booking.bookingStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Payment Status</span>
                    <span className="font-bold uppercase text-rose-600">
                      {verificationResult.booking.paymentStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Target Venue</span>
                    <span className="font-bold text-[#0F172A]">
                      {verificationResult.booking.turfName}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
