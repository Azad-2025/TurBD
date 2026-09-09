import React from 'react';
import { X, Printer, ShieldCheck, QrCode, Download, CheckCircle2, Calendar, Clock, MapPin } from 'lucide-react';
import { Booking } from '../types';

interface PaymentReceiptModalProps {
  booking: Booking;
  onClose: () => void;
  transactionId?: string;
  paymentMethod?: string;
  paymentAmount?: number;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  booking,
  onClose,
  transactionId,
  paymentMethod,
  paymentAmount,
}) => {
  const trxId = transactionId || booking.transactionId || `TRX_${booking.bookingCode}`;
  const method = (paymentMethod || booking.paymentMethod || 'bkash').toUpperCase();
  const amountPaid = paymentAmount !== undefined ? paymentAmount : booking.advancePaid;
  const remainingDue = Math.max(0, booking.totalAmount - amountPaid);
  const isFullyPaid = remainingDue === 0 || booking.paymentStatus === 'paid';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl print:border-none print:shadow-none print:w-full print:max-w-none">
        {/* Header toolbar (Hidden when printing) */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-neutral-800 bg-neutral-950 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Official Payment Receipt
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-xl text-xs font-semibold transition-all"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 sm:p-8 space-y-6 text-neutral-200 print:text-black print:p-8" id="printable-receipt">
          {/* Brand & Invoice Bar */}
          <div className="flex items-start justify-between border-b border-neutral-800 print:border-neutral-300 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-emerald-400 tracking-tight print:text-emerald-700">
                  Turf<span className="text-white print:text-black">BD</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 print:bg-emerald-100 print:text-emerald-800">
                  Verified
                </span>
              </div>
              <p className="text-xs text-neutral-400 print:text-neutral-600 mt-1">
                Bangladesh Premier Sports Arena & Turf Network
              </p>
            </div>

            <div className="text-right">
              <div className="text-[11px] font-mono text-neutral-400 print:text-neutral-600">INVOICE NO</div>
              <div className="text-base font-black font-mono text-white print:text-black">
                INV-{booking.bookingCode}
              </div>
              <div className="text-[10px] text-neutral-400 print:text-neutral-600">
                Date: {new Date(booking.createdAt || Date.now()).toLocaleDateString('en-GB')}
              </div>
            </div>
          </div>

          {/* Customer & Turf Details */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-neutral-400 print:text-neutral-600">
                Customer Details
              </span>
              <div className="font-bold text-white print:text-black text-sm">{booking.userName}</div>
              <div className="text-neutral-400 print:text-neutral-700">{booking.userPhone}</div>
              <div className="text-neutral-400 print:text-neutral-700">{booking.userEmail}</div>
            </div>

            <div className="space-y-1 text-right">
              <span className="text-[10px] uppercase font-bold text-neutral-400 print:text-neutral-600">
                Arena & Venue
              </span>
              <div className="font-bold text-white print:text-black text-sm">{booking.turfName}</div>
              <div className="text-neutral-400 print:text-neutral-700">
                {booking.turfArea}, {booking.turfCity}
              </div>
              <div className="text-neutral-400 print:text-neutral-700">Bangladesh</div>
            </div>
          </div>

          {/* Match Schedule Box */}
          <div className="bg-neutral-950 print:bg-neutral-100 p-4 rounded-2xl border border-neutral-800 print:border-neutral-300 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 print:bg-emerald-200 print:text-emerald-800">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-neutral-400 print:text-neutral-600">Match Date</div>
                <div className="text-sm font-black text-white print:text-black">{booking.date}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 print:bg-purple-200 print:text-purple-800">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-neutral-400 print:text-neutral-600">Slot Time</div>
                <div className="text-sm font-black text-white print:text-black font-mono">
                  {booking.startTime} - {booking.endTime}
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Financial Breakdown */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-neutral-400 print:text-neutral-600">
              Payment Breakdown
            </div>
            <div className="border border-neutral-800 print:border-neutral-300 rounded-2xl overflow-hidden divide-y divide-neutral-800 print:divide-neutral-300">
              <div className="p-3 bg-neutral-950/60 print:bg-neutral-50 flex items-center justify-between text-xs">
                <span>Total Match Slot Fee ({booking.durationHours || 1} hr)</span>
                <span className="font-mono font-bold text-white print:text-black">
                  ৳{booking.totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-emerald-500/5 print:bg-emerald-50 flex items-center justify-between text-xs text-emerald-400 print:text-emerald-800 font-bold">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Amount Paid via {method}</span>
                </div>
                <span className="font-mono">৳{amountPaid.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-neutral-950/60 print:bg-neutral-50 flex items-center justify-between text-xs">
                <span className="text-neutral-400 print:text-neutral-600">Remaining Balance (Due on Arrival)</span>
                <span
                  className={`font-mono font-bold ${
                    remainingDue > 0 ? 'text-amber-400 print:text-amber-700' : 'text-emerald-400 print:text-emerald-700'
                  }`}
                >
                  ৳{remainingDue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Security & Verification Stamp */}
          <div className="p-4 rounded-2xl bg-neutral-950 print:bg-neutral-100 border border-neutral-800 print:border-neutral-300 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 print:text-emerald-800">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Transaction #{trxId}</span>
              </div>
              <p className="text-[10px] text-neutral-400 print:text-neutral-600 leading-relaxed">
                Processed via {method} Gateway. Cryptographically validated on TurfBD server infrastructure.
              </p>
            </div>

            <div className="p-2 bg-white rounded-xl shrink-0 text-black flex flex-col items-center justify-center">
              <QrCode className="w-10 h-10" />
              <span className="text-[8px] font-mono font-bold tracking-tight">SCAN CHECK-IN</span>
            </div>
          </div>

          {/* Footer Terms */}
          <div className="pt-2 border-t border-neutral-800 print:border-neutral-300 text-center text-[10px] text-neutral-400 print:text-neutral-600">
            Thank you for choosing TurfBD. For support or cancellation, visit turfbd.com/support or call +880 1819-876543.
          </div>
        </div>
      </div>
    </div>
  );
};
