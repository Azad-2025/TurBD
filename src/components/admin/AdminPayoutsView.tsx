import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PayoutRequest, PayoutStatus } from '../../types';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Building2,
  Phone,
  Mail,
  User,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export const AdminPayoutsView: React.FC = () => {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'dispatch' | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [txRefInput, setTxRefInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadPayouts = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getAdminPayouts();
      setPayouts(data);
    } catch (err: any) {
      console.error('Failed to load payouts:', err);
      setErrorMsg(err.message || 'Failed to load payout requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  const openActionModal = (payout: PayoutRequest, type: 'approve' | 'reject' | 'dispatch') => {
    setSelectedPayout(payout);
    setActionType(type);
    setReasonInput('');
    setTxRefInput('');
    setNotesInput('');
    setErrorMsg('');
  };

  const handleConfirmAction = async () => {
    if (!selectedPayout || !actionType) return;

    if (actionType === 'reject' && !reasonInput.trim()) {
      setErrorMsg('A rejection reason is required.');
      return;
    }

    if (actionType === 'dispatch' && !txRefInput.trim()) {
      setErrorMsg('A transaction reference ID (e.g. bKash TrxID or Bank ref) is required when marking as dispatched.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    try {
      let status: PayoutStatus;
      if (actionType === 'approve') status = 'approved';
      else if (actionType === 'reject') status = 'rejected';
      else status = 'dispatched';

      const res = await api.updateAdminPayout(selectedPayout.id, actionType, {
        rejectionReason: actionType === 'reject' ? reasonInput.trim() : undefined,
        transactionReference: actionType === 'dispatch' ? txRefInput.trim() : undefined,
        notes: notesInput.trim() || undefined,
      });

      setSuccessMsg(res.message || `Payout #${selectedPayout.id} updated successfully.`);
      setSelectedPayout(null);
      setActionType(null);
      await loadPayouts();
    } catch (err: any) {
      console.error('Failed to update payout:', err);
      setErrorMsg(err.message || 'Failed to update payout request');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPayouts = payouts.filter((p) => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p.id.toString().includes(q) ||
      (p.ownerName && p.ownerName.toLowerCase().includes(q)) ||
      (p.ownerEmail && p.ownerEmail.toLowerCase().includes(q)) ||
      (p.ownerPhone && p.ownerPhone.includes(q)) ||
      p.accountNumber.includes(q) ||
      p.method.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const pendingCount = payouts.filter((p) => p.status === 'pending').length;
  const approvedCount = payouts.filter((p) => p.status === 'approved').length;
  const dispatchedTotal = payouts
    .filter((p) => p.status === 'dispatched')
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#0FA958]" />
            Owner Payout &amp; Settlement Requests
          </h2>
          <p className="text-xs text-[#64748B]">
            Review, approve, and record electronic disbursement of turf owner net balances
          </p>
        </div>
        <button
          onClick={loadPayouts}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Requests
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1 flex items-center justify-between">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">{pendingCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Awaiting administrator approval</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1 flex items-center justify-between">
            <span>Approved / In Queue</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">{approvedCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Ready for bank/MFS transfer</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-1 flex items-center justify-between">
            <span>Total Disbursed</span>
            <Truck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-800 font-mono">
            BDT {dispatchedTotal.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Successfully transferred to owners</div>
        </div>
      </div>

      {/* Feedback Messages */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-card">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, owner name, phone, account number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0FA958]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0F172A] font-semibold focus:outline-none focus:border-[#0FA958]"
          >
            <option value="all">All Statuses ({payouts.length})</option>
            <option value="pending">Pending ({payouts.filter((p) => p.status === 'pending').length})</option>
            <option value="approved">Approved ({payouts.filter((p) => p.status === 'approved').length})</option>
            <option value="dispatched">Dispatched / Paid ({payouts.filter((p) => p.status === 'dispatched').length})</option>
            <option value="rejected">Rejected ({payouts.filter((p) => p.status === 'rejected').length})</option>
          </select>
        </div>
      </div>

      {/* Payouts Table */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-card">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0FA958]" />
          <p className="text-xs font-semibold">Loading payout requests...</p>
        </div>
      ) : filteredPayouts.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-card space-y-2">
          <DollarSign className="w-10 h-10 mx-auto text-slate-300" />
          <h4 className="text-sm font-bold text-slate-700">No payout requests found</h4>
          <p className="text-xs text-slate-500">
            {statusFilter !== 'all' ? `No requests with status '${statusFilter}'` : 'No payout requests have been submitted yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">ID &amp; Date</th>
                  <th className="px-4 py-3">Turf Owner</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method &amp; Account</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ref / Notes</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayouts.map((p) => {
                  const statusColors = {
                    pending: 'bg-amber-50 text-amber-800 border-amber-200',
                    approved: 'bg-emerald-50 text-[#064E3B] border-emerald-200',
                    dispatched: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                    rejected: 'bg-red-50 text-red-700 border-red-200',
                  }[p.status];

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

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{p.ownerName || `Owner #${p.ownerId}`}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          {p.ownerPhone && <span>{p.ownerPhone}</span>}
                          {p.ownerEmail && (
                            <>
                              <span>•</span>
                              <span>{p.ownerEmail}</span>
                            </>
                          )}
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
                            {p.accountDetails.accountTitle && <span> • {p.accountDetails.accountTitle}</span>}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide inline-flex items-center gap-1 ${statusColors}`}>
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
                            Trx: {p.transactionReference}
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
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status === 'pending' && (
                            <>
                              <button
                                onClick={() => openActionModal(p, 'approve')}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#064E3B] border border-emerald-200 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => openActionModal(p, 'reject')}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {p.status === 'approved' && (
                            <button
                              onClick={() => openActionModal(p, 'dispatch')}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Truck className="w-3 h-3" />
                              Mark Dispatched
                            </button>
                          )}

                          {(p.status === 'dispatched' || p.status === 'rejected') && (
                            <span className="text-[10px] text-slate-400 italic">Finalized</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Modal (Approve / Reject / Dispatch) */}
      {selectedPayout && actionType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-modal border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0F172A] capitalize">
                  {actionType === 'approve' && 'Approve Payout Request'}
                  {actionType === 'reject' && 'Reject Payout Request'}
                  {actionType === 'dispatch' && 'Record Payout Disbursement'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Request #{selectedPayout.id} • BDT {selectedPayout.amount.toLocaleString()} for {selectedPayout.ownerName}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedPayout(null);
                  setActionType(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Method:</span>
                <span className="font-bold uppercase text-slate-800">{selectedPayout.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Account:</span>
                <span className="font-mono font-bold text-slate-800">{selectedPayout.accountNumber}</span>
              </div>
              {selectedPayout.accountDetails?.bankName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank:</span>
                  <span className="font-medium text-slate-800">
                    {selectedPayout.accountDetails.bankName} ({selectedPayout.accountDetails.branchName})
                  </span>
                </div>
              )}
            </div>

            {actionType === 'reject' && (
              <div>
                <label className="block text-xs font-bold text-red-700 mb-1">
                  Rejection Reason (Required) *
                </label>
                <textarea
                  rows={3}
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="e.g. Account number mismatch with national ID, incorrect bank routing, dispute on venue bookings..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 text-slate-800"
                />
              </div>
            )}

            {actionType === 'dispatch' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Transaction Reference / TrxID (Required) *
                  </label>
                  <input
                    type="text"
                    value={txRefInput}
                    onChange={(e) => setTxRefInput(e.target.value)}
                    placeholder="e.g. 9H7B6K5543 or BRAC-EFT-99482"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0FA958] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Disbursement Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="e.g. Sent via corporate bKash portal at 14:30"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0FA958]"
                  />
                </div>
              </div>
            )}

            {actionType === 'approve' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                Approving this payout confirms the owner's net available balance is accurate. The request will move to the Approved queue ready for finance disbursement.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPayout(null);
                  setActionType(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={actionLoading}
                className={`px-4 py-2 font-bold rounded-xl text-xs text-white cursor-pointer transition-colors flex items-center gap-1.5 ${
                  actionType === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : actionType === 'dispatch'
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-[#0FA958] hover:bg-[#0D944D]'
                }`}
              >
                {actionLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                Confirm {actionType === 'approve' ? 'Approval' : actionType === 'reject' ? 'Rejection' : 'Disbursement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
