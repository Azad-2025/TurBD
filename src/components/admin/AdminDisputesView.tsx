import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Search,
  Filter,
  RefreshCw,
  FileText,
  DollarSign,
  User,
  Building2,
  Calendar,
} from 'lucide-react';
import { Dispute } from '../../types';

export const AdminDisputesView: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'under_review' | 'resolved_refunded' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [modalDispute, setModalDispute] = useState<Dispute | null>(null);
  const [modalAction, setModalAction] = useState<'refund' | 'reject' | 'review'>('refund');
  const [adminNotes, setAdminNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await api.getDisputes();
      setDisputes(data);
    } catch (err: any) {
      console.error('Failed to load disputes:', err);
      setErrorMsg(err.message || 'Failed to retrieve dispute claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  const openActionModal = (dispute: Dispute, action: 'refund' | 'reject' | 'review') => {
    setModalDispute(dispute);
    setModalAction(action);
    setAdminNotes(dispute.adminNotes || '');
    setErrorMsg(null);
  };

  const handleExecuteAction = async () => {
    if (!modalDispute) return;

    if (modalAction === 'reject' && !adminNotes.trim()) {
      setErrorMsg('Rejection reason/notes are mandatory when rejecting a dispute claim.');
      return;
    }

    try {
      setProcessingId(modalDispute.id);
      setErrorMsg(null);
      await api.updateDispute(modalDispute.id, modalAction, {
        adminNotes: adminNotes.trim() || undefined,
      });

      setSuccessMsg(
        modalAction === 'refund'
          ? `Dispute #${modalDispute.id} resolved and refund of BDT ${modalDispute.requestedAmount.toLocaleString()} processed!`
          : modalAction === 'reject'
          ? `Dispute #${modalDispute.id} rejected.`
          : `Dispute #${modalDispute.id} marked as under review.`
      );

      setModalDispute(null);
      await loadDisputes();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Failed to update dispute:', err);
      setErrorMsg(err.message || 'Failed to update dispute status');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredDisputes = disputes.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = (d.bookingCode || '').toLowerCase().includes(q);
      const matchName = (d.userName || '').toLowerCase().includes(q);
      const matchTurf = (d.turfName || '').toLowerCase().includes(q);
      const matchReason = (d.reason || '').toLowerCase().includes(q);
      const matchDesc = (d.description || '').toLowerCase().includes(q);
      return matchCode || matchName || matchTurf || matchReason || matchDesc;
    }
    return true;
  });

  const openCount = disputes.filter((d) => d.status === 'open').length;
  const reviewCount = disputes.filter((d) => d.status === 'under_review').length;
  const resolvedCount = disputes.filter((d) => d.status === 'resolved_refunded').length;
  const rejectedCount = disputes.filter((d) => d.status === 'rejected').length;

  return (
    <div className="space-y-6" id="admin-disputes-view">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Open Disputes</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{openCount}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">Requires admin review</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Under Review</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{reviewCount}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">Owner & booking check in progress</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Refunded &amp; Resolved</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#064E3B]">{resolvedCount}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Legitimate refunds processed</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Rejected Claims</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{rejectedCount}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-1">Policy violations / baseless</div>
        </div>
      </div>

      {/* Action Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(['all', 'open', 'under_review', 'resolved_refunded', 'rejected'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#064E3B] text-white shadow-soft'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all'
                ? `All Disputes (${disputes.length})`
                : st === 'open'
                ? `Open (${openCount})`
                : st === 'under_review'
                ? `Under Review (${reviewCount})`
                : st === 'resolved_refunded'
                ? `Resolved (${resolvedCount})`
                : `Rejected (${rejectedCount})`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code, customer, turf..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0FA958]"
            />
          </div>
          <button
            onClick={loadDisputes}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Refresh disputes"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Disputes Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
        {loading && disputes.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0FA958]" />
            Loading disputes and refund claims...
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            No dispute claims match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                  <th className="p-3.5 font-semibold">Dispute ID</th>
                  <th className="p-3.5 font-semibold">Customer &amp; Booking</th>
                  <th className="p-3.5 font-semibold">Venue</th>
                  <th className="p-3.5 font-semibold">Claim Reason &amp; Details</th>
                  <th className="p-3.5 font-semibold">Claim Amount</th>
                  <th className="p-3.5 font-semibold">Status</th>
                  <th className="p-3.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDisputes.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      #{d.id}
                      <div className="text-[10px] text-slate-400 font-normal">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{d.userName || 'Customer'}</span>
                      </div>
                      <div className="text-[11px] font-mono text-emerald-700 font-semibold mt-0.5">
                        {d.bookingCode || `Booking #${d.bookingId}`}
                      </div>
                      <div className="text-[10px] text-slate-500">{d.userPhone || d.userEmail}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{d.turfName || `Turf #${d.turfId}`}</span>
                      </div>
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                        {d.reason.replace(/_/g, ' ')}
                      </span>
                      <p className="text-slate-600 text-[11px] mt-1 leading-snug line-clamp-2" title={d.description}>
                        {d.description}
                      </p>
                      {d.adminNotes && (
                        <div className="mt-1 text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                          <span className="font-bold">Admin: </span>{d.adminNotes}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono font-black text-rose-600 text-sm">
                        ৳{d.requestedAmount.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          d.status === 'open'
                            ? 'bg-amber-100 text-amber-800'
                            : d.status === 'under_review'
                            ? 'bg-blue-100 text-blue-800'
                            : d.status === 'resolved_refunded'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {d.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        {d.status === 'open' && (
                          <button
                            onClick={() => openActionModal(d, 'review')}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                          >
                            Mark Review
                          </button>
                        )}
                        {(d.status === 'open' || d.status === 'under_review') && (
                          <>
                            <button
                              onClick={() => openActionModal(d, 'refund')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-colors shadow-soft cursor-pointer"
                            >
                              Approve Refund
                            </button>
                            <button
                              onClick={() => openActionModal(d, 'reject')}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 text-rose-600 font-bold text-[10px] rounded-lg transition-colors border border-slate-200 cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {(d.status === 'resolved_refunded' || d.status === 'rejected') && (
                          <span className="text-[10px] text-slate-400 font-medium">Closed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Confirmation Modal */}
      {modalDispute && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {modalAction === 'refund' ? (
                  <>
                    <RotateCcw className="w-5 h-5 text-emerald-600" />
                    <span>Approve &amp; Process Refund</span>
                  </>
                ) : modalAction === 'reject' ? (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span>Reject Dispute Claim</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span>Mark Under Review</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setModalDispute(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Dispute ID:</span>
                <span className="font-bold text-slate-900">#{modalDispute.id}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Booking Code:</span>
                <span className="font-mono font-bold text-emerald-700">{modalDispute.bookingCode}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Customer:</span>
                <span className="font-bold text-slate-900">{modalDispute.userName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Venue:</span>
                <span className="font-bold text-slate-900">{modalDispute.turfName}</span>
              </div>
              <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-1.5">
                <span>Claimed Refund Amount:</span>
                <span className="font-mono font-black text-rose-600 text-sm">
                  ৳{modalDispute.requestedAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {modalAction === 'reject'
                  ? 'Rejection Reason (Mandatory for record & audit):'
                  : 'Administrative Notes (Optional):'}
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={
                  modalAction === 'reject'
                    ? 'State clear reason why this dispute is rejected...'
                    : 'Notes regarding dispute investigation or payment gateway...'
                }
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0FA958]"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setModalDispute(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={processingId !== null}
                className={`px-5 py-2 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2 ${
                  modalAction === 'refund'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : modalAction === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                }`}
              >
                {processingId !== null && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {modalAction === 'refund'
                    ? 'Confirm & Process Refund'
                    : modalAction === 'reject'
                    ? 'Reject Dispute'
                    : 'Update Status'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
