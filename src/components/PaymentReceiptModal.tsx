import React, { useState } from 'react';
import { X, Printer, ShieldCheck, QrCode, Download, CheckCircle2, Calendar, Clock, MapPin, MessageCircle, Share2, Check, Users } from 'lucide-react';
import { Booking } from '../types';
import { TurfBDLogo } from './TurfBDLogo';
import { generateSquadShareData } from '../utils/shareUtils';
import { SquadCostSplitterModal } from './SquadCostSplitterModal';

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
  const [copied, setCopied] = useState(false);
  const [showSplitterModal, setShowSplitterModal] = useState(false);
  const trxId = transactionId || booking.transactionId || `TRX_${booking.bookingCode}`;
  const method = (paymentMethod || booking.paymentMethod || 'bkash').toUpperCase();
  const amountPaid = paymentAmount !== undefined ? paymentAmount : booking.advancePaid;
  const remainingDue = Math.max(0, booking.totalAmount - amountPaid);
  const isFullyPaid = remainingDue === 0 || booking.paymentStatus === 'paid';

  const shareData = generateSquadShareData(booking);

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Payment Receipt: ${booking.turfName}`,
          text: shareData.shareText,
        });
        return;
      } catch (e) {
        // Fall back
      }
    }
    navigator.clipboard.writeText(shareData.shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl print:border-none print:shadow-none print:w-full print:max-w-none">
        {/* Header toolbar (Hidden when printing) */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0FA958] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Official Payment Receipt
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={shareData.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0FA958] hover:bg-[#064E3B] text-white font-bold rounded-xl text-xs transition-all shadow-2xs"
              title="Share Receipt on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <button
              onClick={() => setShowSplitterModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#064E3B] border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Split Cost with Squad"
            >
              <Users className="w-3.5 h-3.5 text-[#0FA958]" />
              <span className="hidden sm:inline">Split</span>
            </button>
            <a
              href={`/api/invoices/booking/${booking.id}/html`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="View Official Tax Invoice in New Window"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tax Invoice</span>
            </a>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="Share or Copy Summary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#0FA958]" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 sm:p-8 space-y-6 text-[#0F172A] print:text-black print:p-8" id="printable-receipt">
          {/* Brand & Invoice Bar */}
          <div className="flex items-start justify-between border-b border-slate-200 print:border-neutral-300 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <TurfBDLogo
                  layout="horizontal"
                  size="sm"
                  variant="light"
                  showBadge={true}
                  badgeText="Verified"
                  id="receipt-turfbd-logo"
                />
              </div>
              <p className="text-xs text-slate-500 print:text-neutral-600 mt-1.5">
                Bangladesh Premier Sports Arena &amp; Turf Network
              </p>
            </div>

            <div className="text-right">
              <div className="text-[11px] font-mono text-slate-500 print:text-neutral-600">INVOICE NO</div>
              <div className="text-base font-black font-mono text-[#064E3B] print:text-black">
                INV-{booking.bookingCode}
              </div>
              <div className="text-[10px] text-slate-500 print:text-neutral-600">
                Date: {new Date(booking.createdAt || Date.now()).toLocaleDateString('en-GB')}
              </div>
            </div>
          </div>

          {/* Customer & Turf Details */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 print:text-neutral-600">
                Customer Details
              </span>
              <div className="font-bold text-[#0F172A] print:text-black text-sm">{booking.userName}</div>
              <div className="text-slate-600 print:text-neutral-700">{booking.userPhone}</div>
              <div className="text-slate-600 print:text-neutral-700">{booking.userEmail}</div>
            </div>

            <div className="space-y-1 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 print:text-neutral-600">
                Arena &amp; Venue
              </span>
              <div className="font-bold text-[#0F172A] print:text-black text-sm">{booking.turfName}</div>
              <div className="text-slate-600 print:text-neutral-700">
                {booking.turfArea}, {booking.turfCity}
              </div>
              <div className="text-slate-600 print:text-neutral-700">Bangladesh</div>
            </div>
          </div>

          {/* Match Schedule Box */}
          <div className="bg-slate-50 print:bg-neutral-100 p-4 rounded-2xl border border-slate-200 print:border-neutral-300 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-[#064E3B] print:bg-emerald-200 print:text-emerald-800">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 print:text-neutral-600">Match Date</div>
                <div className="text-sm font-black text-[#0F172A] print:text-black">{booking.date}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 print:bg-purple-200 print:text-purple-800">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 print:text-neutral-600">Slot Time</div>
                <div className="text-sm font-black text-[#0F172A] print:text-black font-mono">
                  {booking.startTime} - {booking.endTime}
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Financial Breakdown */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-slate-500 print:text-neutral-600">
              Payment Breakdown
            </div>
            <div className="border border-slate-200 print:border-neutral-300 rounded-2xl overflow-hidden divide-y divide-slate-200 print:divide-neutral-300 shadow-2xs">
              <div className="p-3 bg-slate-50/50 print:bg-neutral-50 flex items-center justify-between text-xs">
                <span>Total Match Slot Fee ({booking.durationHours || 1} hr)</span>
                <span className="font-mono font-bold text-[#0F172A] print:text-black">
                  BDT {booking.totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 print:bg-emerald-50 flex items-center justify-between text-xs text-[#064E3B] print:text-emerald-800 font-bold">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0FA958]" />
                  <span>Amount Paid via {method}</span>
                </div>
                <span className="font-mono font-bold text-[#0FA958]">BDT {amountPaid.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50/50 print:bg-neutral-50 flex items-center justify-between text-xs">
                <span className="text-slate-600 print:text-neutral-600">Remaining Balance (Due on Arrival)</span>
                <span
                  className={`font-mono font-bold ${
                    remainingDue > 0 ? 'text-amber-700 print:text-amber-700' : 'text-[#0FA958] print:text-emerald-700'
                  }`}
                >
                  BDT {remainingDue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Security & Verification Stamp */}
          <div className="p-4 rounded-2xl bg-slate-50 print:bg-neutral-100 border border-slate-200 print:border-neutral-300 flex items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#064E3B] print:text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-[#0FA958]" />
                <span>Verified Transaction #{trxId}</span>
              </div>
              <p className="text-[10px] text-slate-500 print:text-neutral-600 leading-relaxed">
                Processed via {method} Gateway. Cryptographically validated on TurfBD server infrastructure.
              </p>
            </div>

            <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0 text-slate-900 flex flex-col items-center justify-center">
              <QrCode className="w-10 h-10" />
              <span className="text-[8px] font-mono font-bold tracking-tight">SCAN CHECK-IN</span>
            </div>
          </div>

          {/* Footer Terms */}
          <div className="pt-2 border-t border-slate-200 print:border-neutral-300 text-center text-[10px] text-slate-500 print:text-neutral-600">
            Thank you for choosing TurfBD. For support or cancellation, visit turfbd.com/support or call +880 1819-876543.
          </div>
        </div>
      </div>

      {showSplitterModal && (
        <SquadCostSplitterModal
          booking={booking}
          onClose={() => setShowSplitterModal(false)}
        />
      )}
    </div>
  );
};
