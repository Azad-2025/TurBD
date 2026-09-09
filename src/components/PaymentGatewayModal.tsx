import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Clock, AlertTriangle, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { api } from '../services/api';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  gateway: 'bkash' | 'nagad' | 'sslcommerz' | 'rocket' | 'cash_on_field';
  amount: number;
  bookingId: number;
  bookingCode: string;
  turfName: string;
  paymentId: number;
  onSuccess: (verificationResult: any) => void;
  onCancel: () => void;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  gateway,
  amount,
  bookingId,
  bookingCode,
  turfName,
  paymentId,
  onSuccess,
  onCancel,
}) => {
  // 15-minute countdown timer (900 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states per gateway
  const [accountNumber, setAccountNumber] = useState('01711234567');
  const [otp, setOtp] = useState('123456');
  const [pin, setPin] = useState('12345');
  const [sslTab, setSslTab] = useState<'cards' | 'mfs' | 'net'>('mfs');
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');

  // Checkout sub-step for bKash / Nagad (1: number, 2: otp/pin)
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (!isOpen) return;
    setSecondsRemaining(15 * 60);
    setErrorMessage(null);
    setCheckoutStep(1);

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMessage('Payment session timed out (15 minutes expired). Please retry.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const fillTestCredentials = () => {
    setAccountNumber('01711234567');
    setOtp('123456');
    setPin('12345');
    setCardNumber('4111 2222 3333 4444');
  };

  const handleExecutePayment = async () => {
    if (secondsRemaining <= 0) {
      setErrorMessage('Session expired. Please restart the checkout.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      // Synthetic or realistic gateway transaction reference
      const prefix = gateway === 'bkash' ? 'BKA' : gateway === 'nagad' ? 'NGD' : 'SSL';
      const syntheticTrxId = `${prefix}${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      // Call server-side payment verification API
      const result = await api.verifyPayment({
        paymentId,
        bookingId,
        gateway,
        transactionId: syntheticTrxId,
        amount,
      });

      if (result.success && result.verified) {
        onSuccess(result);
      } else {
        setErrorMessage(result.message || 'Payment verification failed on server.');
      }
    } catch (err: any) {
      console.error('Payment verification error:', err);
      setErrorMessage(err.message || 'Unable to connect to gateway verification server.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* GATEWAY BRAND HEADER */}
        {gateway === 'bkash' && (
          <div className="bg-[#E2136E] text-white p-5 text-center relative">
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-xl font-black tracking-tight">bKash</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/20">
                Sandbox v1.2
              </span>
            </div>
            <div className="text-xs text-white/90">Tokenized Checkout API</div>
          </div>
        )}

        {gateway === 'nagad' && (
          <div className="bg-gradient-to-r from-[#F7941D] to-[#ED1C24] text-white p-5 text-center relative">
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-xl font-black tracking-tight">নগদ | Nagad</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/20">
                DFS Sandbox
              </span>
            </div>
            <div className="text-xs text-white/90">Post Office Digital Payment Gateway</div>
          </div>
        )}

        {gateway === 'sslcommerz' && (
          <div className="bg-[#184A90] text-white p-5 text-center relative">
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-xl font-black tracking-tight">SSLCommerz</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/20">
                Multi-Gateway
              </span>
            </div>
            <div className="text-xs text-white/90">Cards • MFS • Internet Banking</div>
          </div>
        )}

        {/* ORDER SUMMARY STRIP */}
        <div className="bg-neutral-950 px-5 py-3 border-b border-neutral-800 flex items-center justify-between text-xs">
          <div>
            <div className="text-[10px] text-neutral-400 font-medium">{turfName}</div>
            <div className="font-mono font-bold text-white tracking-wider">#{bookingCode}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-neutral-400">Payable Amount</div>
            <div className="font-mono font-black text-emerald-400 text-sm sm:text-base">
              ৳{amount.toLocaleString()} BDT
            </div>
          </div>
        </div>

        {/* TIMEOUT BADGE */}
        <div className="px-5 py-2 bg-neutral-850 border-b border-neutral-800 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Session expires in:</span>
            <span
              className={`font-mono font-bold ${
                secondsRemaining < 120 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
              }`}
            >
              {timeFormatted}
            </span>
          </div>
          <button
            type="button"
            onClick={fillTestCredentials}
            className="text-[10px] text-purple-400 hover:text-purple-300 underline font-medium"
          >
            Auto-fill Test Credentials
          </button>
        </div>

        {/* BODY CONTENT */}
        <div className="p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* bKash Interface */}
          {gateway === 'bkash' && (
            <div className="space-y-3">
              {checkoutStep === 1 ? (
                <>
                  <div className="text-neutral-300 font-medium">
                    Enter your bKash Account Number to authorize payment:
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">
                      bKash Mobile Number
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div className="text-[10px] text-neutral-400 leading-relaxed">
                    By clicking &quot;Next&quot;, you agree to bKash merchant checkout terms &amp; conditions.
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckoutStep(2)}
                    className="w-full py-2.5 rounded-xl bg-[#E2136E] hover:bg-[#c90f5f] text-white font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>Proceed to Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="text-neutral-300 font-medium">
                    Enter OTP sent to <strong className="text-white">{accountNumber}</strong> and your PIN:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">
                        Verification Code (OTP)
                      </label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="123456"
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono text-white text-center focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">
                        bKash PIN
                      </label>
                      <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="•••••"
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono text-white text-center focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep(1)}
                      className="w-1/3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-center transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={isVerifying}
                      onClick={handleExecutePayment}
                      className="w-2/3 py-2.5 rounded-xl bg-[#E2136E] hover:bg-[#c90f5f] disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-pink-900/40"
                    >
                      {isVerifying ? (
                        <span>Verifying with Server...</span>
                      ) : (
                        <span>Confirm ৳{amount.toLocaleString()}</span>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Nagad Interface */}
          {gateway === 'nagad' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">
                  Nagad Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">
                  Nagad PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                <input type="checkbox" defaultChecked className="rounded accent-orange-500" id="nagad-agree" />
                <label htmlFor="nagad-agree">I agree to Nagad DFS merchant terms</label>
              </div>

              <button
                type="button"
                disabled={isVerifying}
                onClick={handleExecutePayment}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F7941D] to-[#ED1C24] hover:opacity-90 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-900/40"
              >
                {isVerifying ? <span>Verifying with Server...</span> : <span>Proceed ৳{amount.toLocaleString()}</span>}
              </button>
            </div>
          )}

          {/* SSLCommerz Interface */}
          {gateway === 'sslcommerz' && (
            <div className="space-y-3">
              {/* Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setSslTab('mfs')}
                  className={`py-1.5 rounded-lg transition-all ${
                    sslTab === 'mfs' ? 'bg-[#184A90] text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Mobile Banking
                </button>
                <button
                  type="button"
                  onClick={() => setSslTab('cards')}
                  className={`py-1.5 rounded-lg transition-all ${
                    sslTab === 'cards' ? 'bg-[#184A90] text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setSslTab('net')}
                  className={`py-1.5 rounded-lg transition-all ${
                    sslTab === 'net' ? 'bg-[#184A90] text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Net Banking
                </button>
              </div>

              {sslTab === 'cards' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">Expiry</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono text-white text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">CVV</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono text-white text-center"
                      />
                    </div>
                  </div>
                </div>
              )}

              {sslTab === 'mfs' && (
                <div className="space-y-2">
                  <div className="text-[11px] text-neutral-400">Supported: bKash, Nagad, Rocket, Upay</div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">MFS Mobile Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              )}

              {sslTab === 'net' && (
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-center text-neutral-400 text-xs">
                  City Touch • Islami Bank • EBL Skybanking (Instant Redirection)
                </div>
              )}

              <button
                type="button"
                disabled={isVerifying}
                onClick={handleExecutePayment}
                className="w-full py-2.5 rounded-xl bg-[#184A90] hover:bg-[#12386e] disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/40"
              >
                {isVerifying ? (
                  <span>Validating Transaction...</span>
                ) : (
                  <span>Pay Now ৳{amount.toLocaleString()}</span>
                )}
              </button>
            </div>
          )}

          {/* SECURITY TRUST BADGES */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>256-Bit SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>PCI-DSS Compliant</span>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-neutral-400 hover:text-white transition-all"
          >
            Cancel and Return to Match Overview
          </button>
        </div>
      </div>
    </div>
  );
};
