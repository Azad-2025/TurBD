import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PayoutRequest, PayoutStatus } from '../../types';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  AlertCircle,
  Building2,
  Smartphone,
  CreditCard,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface OwnerPayoutSectionProps {
  financials: any;
  onRefreshFinancials: () => void;
  currentUser: any;
}

export const OwnerPayoutSection: React.FC<OwnerPayoutSectionProps> = ({
  financials,
  onRefreshFinancials,
  currentUser,
}) => {
  const [payoutsList, setPayoutsList] = useState<PayoutRequest[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [amount, setAmount] = useState<number>(5000);
  const [method, setMethod] = useState<'bkash' | 'nagad' | 'bank_transfer' | 'rocket'>('bkash');
  const [accountNumber, setAccountNumber] = useState<string>(currentUser?.phone || '');
  const [bankName, setBankName] = useState<string>('BRAC Bank Ltd');
  const [branchName, setBranchName] = useState<string>('Gulshan Branch');
  const [accountTitle, setAccountTitle] = useState<string>(currentUser?.name || '');
  const [routingNumber, setRoutingNumber] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const netAvailable = financials?.summary?.netPayoutOwed ?? 0;

  const loadPayouts = async () => {
    setLoadingPayouts(true);
    try {
      const data = await api.getOwnerPayments();
      if (data.payouts) {
        setPayoutsList(data.payouts);
      }
    } catch (err) {
      console.error('Failed to load owner payouts:', err);
    } finally {
      setLoadingPayouts(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const payoutAmount = Number(amount);
    if (!payoutAmount || isNaN(payoutAmount) || payoutAmount < 1000) {
      setErrorMsg('Minimum withdrawal request amount is BDT 1,000.');
      return;
    }

    if (payoutAmount > netAvailable) {
      setErrorMsg(
        `Requested amount (BDT ${payoutAmount.toLocaleString()}) exceeds your available balance (BDT ${netAvailable.toLocaleString()}).`
      );
      return;
    }

    if (!accountNumber.trim()) {
      setErrorMsg('Account number or mobile number is required.');
      return;
    }

    if (method === 'bank_transfer' && (!bankName.trim() || !accountTitle.trim())) {
      setErrorMsg('Bank name and account title are required for bank transfer payouts.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        amount: payoutAmount,
        method,
        accountNumber: accountNumber.trim(),
      };

      if (method === 'bank_transfer') {
        payload.accountDetails = {
          bankName: bankName.trim(),
          branchName: branchName.trim(),
          accountTitle: accountTitle.trim(),
          routingNumber: routingNumber.trim(),
        };
      }

      const res = await api.requestOwnerPayout(payload);
      setSuccessMsg(res.message || 'Payout request submitted successfully.');
      await loadPayouts();
      onRefreshFinancials();
    } catch (err: any) {
      console.error('Failed to request payout:', err);
      setErrorMsg(err.message || 'Failed to submit payout request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Total Gross Match Bookings
          </div>
          <div className="text-2xl font-black text-[#0F172A] font-mono">
            BDT {(financials?.summary?.totalGrossRevenue || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Total match fees booked</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Online Advance Collected
          </div>
          <div className="text-2xl font-black text-[#064E3B] font-mono">
            BDT {(financials?.summary?.onlineAdvanceCollected || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Processed via bKash / Nagad / SSL</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1">
            Platform Service Fee (5%)
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">
            BDT {(financials?.summary?.platformCommission || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">TurfBD platform maintenance</div>
        </div>

        <div className="bg-emerald-950 text-white rounded-2xl p-5 shadow-card relative overflow-hidden border border-emerald-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
            Available for Payout
          </div>
          <div className="text-2xl font-black text-[#0FA958] font-mono">
            BDT {netAvailable.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-300/80 mt-1">Net verified balance eligible for withdrawal</div>
        </div>
      </div>

      {/* Payout Request Form & Policy Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Form (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#0FA958]" />
                Request Balance Withdrawal
              </h3>
              <p className="text-xs text-[#64748B]">
                Direct electronic disbursement to your verified bKash, Nagad, Rocket, or Bank account
              </p>
            </div>
            <div className="px-3 py-1 rounded-xl bg-emerald-50 text-[#064E3B] font-bold font-mono text-xs border border-emerald-200">
              Avail: ৳{netAvailable.toLocaleString()}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitPayout} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Withdrawal Amount (BDT) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400">
                    ৳
                  </span>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    max={netAvailable > 0 ? netAvailable : undefined}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 text-xs font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#0FA958]"
                    required
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>Min: BDT 1,000</span>
                  <button
                    type="button"
                    onClick={() => setAmount(netAvailable)}
                    className="text-[#0FA958] font-bold hover:underline cursor-pointer"
                  >
                    Set Max Available
                  </button>
                </div>
              </div>

              {/* Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Disbursement Gateway / Method *
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-[#0FA958]"
                >
                  <option value="bkash">bKash Merchant / Personal Wallet</option>
                  <option value="nagad">Nagad Wallet</option>
                  <option value="rocket">Dutch-Bangla Rocket</option>
                  <option value="bank_transfer">Electronic Bank Transfer (BEFTN / NPSB)</option>
                </select>
              </div>
            </div>

            {/* Account details */}
            {method !== 'bank_transfer' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Account / Wallet Number *
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="017XXXXXXXX"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-[#0FA958]"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#0FA958]" />
                  <span>Bank Account Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bank Name *</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. City Bank / BRAC Bank"
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Branch Name</label>
                    <input
                      type="text"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="e.g. Banani Branch"
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Account Title (Name) *</label>
                    <input
                      type="text"
                      value={accountTitle}
                      onChange={(e) => setAccountTitle(e.target.value)}
                      placeholder="Name as printed on cheque"
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bank Account Number *</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g. 1501203948572001"
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-mono"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting || netAvailable < 1000}
                className="px-6 py-2.5 bg-[#0FA958] hover:bg-[#0D944D] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-soft transition-colors cursor-pointer"
              >
                {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                <span>Submit Payout Request</span>
              </button>
            </div>
          </form>
        </div>

        {/* Policy & Security Card (1 col) */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4 text-xs">
          <div className="font-bold text-[#0F172A] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0FA958]" />
            <span>Disbursement Policy</span>
          </div>

          <div className="space-y-3 text-slate-600 text-[11px] leading-relaxed">
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <strong className="text-slate-900 block font-semibold">T+1 Settlement Window</strong>
              <span>Payout requests submitted before 3:00 PM are reviewed and processed same-day or next business morning.</span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <strong className="text-slate-900 block font-semibold">Real-Time MFS Verification</strong>
              <span>bKash and Nagad transfers are confirmed with instant TrxID reference codes provided in your history below.</span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <strong className="text-slate-900 block font-semibold">Duplicate Protection</strong>
              <span>The platform prevents accidental duplicate payout requests to ensure ledger accuracy.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payout History Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Disbursement &amp; Withdrawal History
            </h3>
            <p className="text-xs text-[#64748B]">
              Real-time audit record of all past payout requests, transaction IDs, and administrative approvals
            </p>
          </div>

          <button
            onClick={loadPayouts}
            disabled={loadingPayouts}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
            title="Refresh history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPayouts ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingPayouts ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0FA958]" />
            <p className="text-xs">Loading disbursement history...</p>
          </div>
        ) : payoutsList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <DollarSign className="w-8 h-8 mx-auto text-slate-300 mb-1" />
            <p className="text-xs font-semibold text-slate-600">No payout requests submitted yet</p>
            <p className="text-[10px] text-slate-400">Your requested withdrawals will appear here once submitted.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">ID &amp; Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method &amp; Account</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reference / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payoutsList.map((p) => {
                  const statusColors: Record<PayoutStatus, string> = {
                    pending: 'bg-amber-50 text-amber-800 border-amber-200',
                    approved: 'bg-emerald-50 text-[#064E3B] border-emerald-200',
                    dispatched: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                    rejected: 'bg-red-50 text-red-700 border-red-200',
                  };

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">#{p.id}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(p.requestedAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-mono font-black text-sm text-[#064E3B]">
                          BDT {p.amount.toLocaleString()}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-bold uppercase text-[11px] text-slate-800">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {p.method}
                          </span>
                          <span className="font-mono">{p.accountNumber}</span>
                        </div>
                        {p.accountDetails && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {p.accountDetails.bankName && <span>{p.accountDetails.bankName}</span>}
                            {p.accountDetails.branchName && <span> ({p.accountDetails.branchName})</span>}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide inline-flex items-center gap-1 ${
                            statusColors[p.status as PayoutStatus] || 'bg-slate-50 text-slate-600'
                          }`}
                        >
                          {p.status === 'pending' && <Clock className="w-3 h-3 text-amber-600 animate-pulse" />}
                          {p.status === 'approved' && <CheckCircle2 className="w-3 h-3 text-[#0FA958]" />}
                          {p.status === 'dispatched' && <Truck className="w-3 h-3 text-indigo-600" />}
                          {p.status === 'rejected' && <XCircle className="w-3 h-3 text-red-600" />}
                          <span>{p.status}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        {p.transactionReference && (
                          <div className="font-mono text-[11px] font-semibold text-indigo-700">
                            TrxID: {p.transactionReference}
                          </div>
                        )}
                        {p.rejectionReason && (
                          <div className="text-[10px] text-red-600 italic">
                            Reason: {p.rejectionReason}
                          </div>
                        )}
                        {p.notes && (
                          <div className="text-[10px] text-slate-500">
                            Notes: {p.notes}
                          </div>
                        )}
                        {!p.transactionReference && !p.rejectionReason && !p.notes && (
                          <span className="text-slate-400 text-[10px]">Processing in review</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
