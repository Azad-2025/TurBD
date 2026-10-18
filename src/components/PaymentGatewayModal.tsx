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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* GATEWAY BRAND HEADER */}
        {gateway === 'bkash' && (
          <div className="bg-[#E2136E] text-white p-5 text-center relative">
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all cursor-pointer"
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
              className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all cursor-pointer"
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
              className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all cursor-pointer"
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
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
          <div>
            <div className="text-[10px] text-slate-500 font-medium">{turfName}</div>
            <div className="font-mono font-bold text-[#0F172A] tracking-wider">#{bookingCode}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500">Payable Amount</div>
            <div className="font-mono font-black text-[#064E3B] text-sm sm:text-base">
              BDT {amount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* TIMEOUT BADGE */}
        <div className="px-5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Session expires in:</span>
            <span
              className={`font-mono font-bold ${
                secondsRemaining < 120 ? 'text-rose-600 animate-pulse' : 'text-amber-700'
              }`}
            >
              {timeFormatted}
            </span>
          </div>
          <button
            type="button"
            onClick={fillTestCredentials}
            className="text-[10px] text-[#0FA958] hover:text-[#064E3B] underline font-medium cursor-pointer"
          >
            Auto-fill Test Credentials
          </button>
        </div>

        {/* BODY CONTENT */}
        <div className="p-5 space-y-4 text-xs text-[#0F172A]">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* bKash Interface */}
          {gateway === 'bkash' && (
            <div className="space-y-3">
              {checkoutStep === 1 ? (
                <>
                  <div className="text-slate-700 font-medium">
                    Enter your bKash Account Number to authorize payment:
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      bKash Mobile Number
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono text-[#0F172A] focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 leading-relaxed">
                    By clicking &quot;Next&quot;, you agree to bKash merchant checkout terms &amp; conditions.
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckoutStep(2)}
                    className="w-full py-2.5 rounded-xl bg-[#E2136E] hover:bg-[#c90f5f] text-white font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-pink-500/20"
                  >
                    <span>Proceed to Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="text-slate-700 font-medium">
                    Enter OTP sent to <strong className="text-[#0F172A]">{accountNumber}</strong> and your PIN:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Verification Code (OTP)
                      </label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="123456"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-[#0F172A] text-center focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        bKash PIN
                      </label>
                      <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="•••••"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-[#0F172A] text-center focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep(1)}
                      className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-center transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={isVerifying}
                      onClick={handleExecutePayment}
                      className="w-2/3 py-2.5 rounded-xl bg-[#E2136E] hover:bg-[#c90f5f] disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-pink-600/30 cursor-pointer"
                    >
                      {isVerifying ? (
                        <span>Verifying with Server...</span>
                      ) : (
                        <span>Confirm BDT {amount.toLocaleString()}</span>
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
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                  Nagad Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono text-[#0F172A] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                  Nagad PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono text-[#0F172A] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center gap-2 text-[10px] text-slate-600">
                <input type="checkbox" defaultChecked className="rounded accent-orange-500" id="nagad-agree" />
                <label htmlFor="nagad-agree">I agree to Nagad DFS merchant terms</label>
              </div>

              <button
                type="button"
                disabled={isVerifying}
                onClick={handleExecutePayment}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F7941D] to-[#ED1C24] hover:opacity-90 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-600/30 cursor-pointer"
              >
                {isVerifying ? <span>Verifying with Server...</span> : <span>Proceed BDT {amount.toLocaleString()}</span>}
              </button>
            </div>
          )}

          {/* SSLCommerz Interface */}
          {gateway === 'sslcommerz' && (
            <div className="space-y-3">
              {/* Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setSslTab('mfs')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    sslTab === 'mfs' ? 'bg-[#184A90] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mobile Banking
                </button>
                <button
                  type="button"
                  onClick={() => setSslTab('cards')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    sslTab === 'cards' ? 'bg-[#184A90] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setSslTab('net')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    sslTab === 'net' ? 'bg-[#184A90] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Net Banking
                </button>
              </div>

              {sslTab === 'cards' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-[#0F172A]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Expiry</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-[#0F172A] text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">CVV</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-[#0F172A] text-center"
                      />
                    </div>
                  </div>
                </div>
              )}

              {sslTab === 'mfs' && (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-600">Supported: bKash, Nagad, Rocket, Upay</div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">MFS Mobile Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-[#0F172A]"
                    />
                  </div>
                </div>
              )}

              {sslTab === 'net' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-600 text-xs">
                  City Touch • Islami Bank • EBL Skybanking (Instant Redirection)
                </div>
              )}

              <button
                type="button"
                disabled={isVerifying}
                onClick={handleExecutePayment}
                className="w-full py-2.5 rounded-xl bg-[#184A90] hover:bg-[#12386e] disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-900/30 cursor-pointer"
              >
                {isVerifying ? (
                  <span>Validating Transaction...</span>
                ) : (
                  <span>Pay Now BDT {amount.toLocaleString()}</span>
                )}
              </button>
            </div>
          )}

          {/* SECURITY TRUST BADGES */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0FA958]" />
              <span>256-Bit SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-600" />
              <span>PCI-DSS Compliant</span>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
          >
            Cancel and Return to Match Overview
          </button>
        </div>
      </div>
    </div>
  );
};
