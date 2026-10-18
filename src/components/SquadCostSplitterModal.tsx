import React, { useState } from 'react';
import {
  X,
  Users,
  DollarSign,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Booking } from '../types';
import { TurfBDLogo } from './TurfBDLogo';

interface SquadCostSplitterModalProps {
  booking: Booking;
  onClose: () => void;
}

interface Participant {
  id: string;
  name: string;
  hasPaid: boolean;
}

export const SquadCostSplitterModal: React.FC<SquadCostSplitterModalProps> = ({
  booking,
  onClose,
}) => {
  const [totalAmount, setTotalAmount] = useState<number>(booking.totalAmount || 2400);
  const [playerCount, setPlayerCount] = useState<number>(10);
  const [receiverPhone, setReceiverPhone] = useState<string>(booking.userPhone || '');
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'cash'>('bkash');
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: `${booking.userName} (Captain)`, hasPaid: true },
  ]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [copied, setCopied] = useState(false);

  // Equal share math: ceil so total isn't shortchanged
  const validPlayers = Math.max(1, playerCount);
  const perPlayerShare = Math.ceil(totalAmount / validPlayers);

  // Stats
  const paidCount = participants.filter((p) => p.hasPaid).length;
  const collectedTotal = paidCount * perPlayerShare;
  const remainingTotal = Math.max(0, totalAmount - collectedTotal);

  const addParticipant = () => {
    if (!newPlayerName.trim()) return;
    setParticipants([
      ...participants,
      {
        id: `p_${Date.now()}`,
        name: newPlayerName.trim(),
        hasPaid: false,
      },
    ]);
    setNewPlayerName('');
  };

  const togglePaid = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, hasPaid: !p.hasPaid } : p))
    );
  };

  const removeParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  // Preset squad sizes
  const squadPresets = [
    { label: '5v5 (10)', count: 10 },
    { label: '6v6 (12)', count: 12 },
    { label: '7v7 (14)', count: 14 },
    { label: '4v4 (8)', count: 8 },
    { label: 'Cricket (11)', count: 11 },
  ];

  // WhatsApp Message Generator
  const generateShareMessage = () => {
    const sportEmoji = booking.sport === 'cricket' ? '🏏' : '⚽';
    let text = `${sportEmoji} *SQUAD COST SPLIT: ${booking.turfName.toUpperCase()}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📅 *Date:* ${booking.date}\n`;
    text += `⏰ *Time:* ${booking.startTime} - ${booking.endTime}\n`;
    text += `📍 *Venue:* ${booking.turfArea}, ${booking.turfCity}\n`;
    text += `🎟️ *Pass Code:* ${booking.bookingCode}\n\n`;
    text += `💰 *Total Match Fee:* BDT ${totalAmount.toLocaleString()}\n`;
    text += `👥 *Total Squad Players:* ${playerCount}\n`;
    text += `👉 *Per Player Share: BDT ${perPlayerShare.toLocaleString()}*\n\n`;

    if (receiverPhone) {
      text += `📲 *Send Money To:* ${receiverPhone} (${paymentMethod.toUpperCase()})\n`;
      text += `Reference: ${booking.bookingCode}\n\n`;
    }

    if (participants.length > 1) {
      text += `*Squad Roster & Status:*\n`;
      participants.forEach((p, idx) => {
        text += `${idx + 1}. ${p.name}: ${p.hasPaid ? '✅ Paid' : '⏳ Pending (BDT ' + perPlayerShare + ')'}\n`;
      });
      text += `\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚠️ *Note:* WhatsApp is a squad collection & coordination helper only. Match booking confirmation is secured via TurfBD server.\n`;
    text += `Please pay your share before kickoff!`;
    return text;
  };

  const shareText = generateShareMessage();
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#064E3B] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Squad Cost Splitter</h3>
              <p className="text-[11px] text-slate-500">Calculate &amp; collect shares via WhatsApp</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Booking Context Pill */}
          <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-[#064E3B]">{booking.turfName}</div>
              <div className="text-slate-600 text-[11px]">
                {booking.date} • {booking.startTime} - {booking.endTime}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-500">Pass Code</div>
              <div className="font-mono font-bold text-[#0F172A]">#{booking.bookingCode}</div>
            </div>
          </div>

          {/* Amount & Players Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Total Match Fee (BDT)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">৳</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Number(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0FA958]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Number of Players
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="2"
                  max="30"
                  value={playerCount}
                  onChange={(e) => setPlayerCount(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0FA958]"
                />
              </div>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Quick Squad Formations
            </span>
            <div className="flex flex-wrap gap-1.5">
              {squadPresets.map((preset) => (
                <button
                  key={preset.count}
                  type="button"
                  onClick={() => setPlayerCount(preset.count)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-all cursor-pointer ${
                    playerCount === preset.count
                      ? 'bg-[#0FA958] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Equal Share Result Callout */}
          <div className="p-4 bg-gradient-to-br from-emerald-500 to-[#064E3B] text-white rounded-2xl shadow-md flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-emerald-100 uppercase tracking-wider">
                Equal Share Per Player
              </div>
              <div className="text-2xl font-black font-mono">
                BDT {perPlayerShare.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-200">
                Split across {playerCount} players (Total BDT {totalAmount.toLocaleString()})
              </div>
            </div>
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs text-right">
              <div className="text-[10px] font-bold text-emerald-100">Collected</div>
              <div className="text-base font-bold font-mono">
                BDT {collectedTotal.toLocaleString()}
              </div>
              <div className="text-[9px] text-emerald-200">
                {paidCount}/{playerCount} Paid
              </div>
            </div>
          </div>

          {/* Payment Collection Details */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Payment Receiver (Captain)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <input
                type="text"
                placeholder="Receiver Phone (e.g. 01711...)"
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#0FA958]"
              />
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0FA958]"
              >
                <option value="bkash">bKash Send Money</option>
                <option value="nagad">Nagad Send Money</option>
                <option value="cash">Cash on Field</option>
              </select>
            </div>
          </div>

          {/* Optional Custom Participants Roster */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Custom Participant Tracker (Optional)
              </span>
              <span className="text-[11px] text-slate-500">
                {participants.length} registered
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add player name (e.g. Tanvir, Shakib...)"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#0FA958]"
              />
              <button
                type="button"
                onClick={addParticipant}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {participants.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="pt-1.5 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-slate-800 truncate max-w-[180px]">
                      {p.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => togglePaid(p.id)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          p.hasPaid
                            ? 'bg-emerald-100 text-[#064E3B] hover:bg-emerald-200'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        }`}
                      >
                        {p.hasPaid ? (
                          <>
                            <Check className="w-3 h-3 text-[#0FA958]" />
                            <span>Paid</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending</span>
                          </>
                        )}
                      </button>
                      {participants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeParticipant(p.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Disclaimer: WhatsApp is helper only */}
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/60 flex items-start gap-2 text-[11px] text-amber-900 leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Collection Helper Notice:</strong> WhatsApp links facilitate friendly peer-to-peer squad collection. WhatsApp is not an automated payment gateway and does not verify transactions. Official match confirmation is held securely on TurfBD.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#0FA958]" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Message</span>
              </>
            )}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 bg-[#0FA958] hover:bg-[#064E3B] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>Share on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
};
