import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  User,
  Phone,
  Mail,
  FileText,
  PauseCircle,
  PlayCircle,
  Search,
  Filter,
} from 'lucide-react';

interface OwnerApplicant {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  ownerVerificationStatus?: 'pending' | 'approved' | 'rejected' | 'suspended';
  ownerSubmittedAt?: string | null;
  ownerReviewedAt?: string | null;
  ownerReviewedBy?: number | null;
  ownerApprovedAt?: string | null;
  ownerApprovedBy?: number | null;
  ownerRejectedAt?: string | null;
  ownerRejectedBy?: number | null;
  ownerRejectionReason?: string | null;
  ownerSuspendedAt?: string | null;
  ownerSuspendedBy?: number | null;
  ownerSuspensionReason?: string | null;
  ownerDocuments?: { type: string; url: string; name: string }[];
  turfs?: any[];
  turfsCount?: number;
  createdAt: string;
}

export const OwnerVerificationView: React.FC = () => {
  const [owners, setOwners] = useState<OwnerApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'suspended'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [modalOwner, setModalOwner] = useState<OwnerApplicant | null>(null);
  const [actionType, setActionType] = useState<'reject' | 'suspend' | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadOwners = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getAdminOwners();
      setOwners(data);
    } catch (err: any) {
      console.error('Failed to load owners:', err);
      setErrorMsg(err.message || 'Failed to load owner applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwners();
  }, []);

  const handleApprove = async (ownerId: number) => {
    setActionLoading(ownerId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.updateOwnerVerification(ownerId, 'approved');
      setSuccessMsg(res.message || 'Owner approved successfully');
      await loadOwners();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve owner');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (ownerId: number) => {
    setActionLoading(ownerId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.updateOwnerVerification(ownerId, 'approved');
      setSuccessMsg(res.message || 'Owner account reactivated successfully');
      await loadOwners();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reactivate owner');
    } finally {
      setActionLoading(null);
    }
  };

  const openActionModal = (owner: OwnerApplicant, type: 'reject' | 'suspend') => {
    setModalOwner(owner);
    setActionType(type);
    setReasonInput('');
    setErrorMsg('');
  };

  const handleConfirmAction = async () => {
    if (!modalOwner || !actionType) return;
    if (!reasonInput.trim()) {
      setErrorMsg(`A ${actionType} reason is required.`);
      return;
    }

    setActionLoading(modalOwner.id);
    try {
      const res = await api.updateOwnerVerification(
        modalOwner.id,
        actionType === 'reject' ? 'rejected' : 'suspended',
        reasonInput.trim()
      );
      setSuccessMsg(res.message || `Owner ${actionType}ed successfully`);
      setModalOwner(null);
      setActionType(null);
      setReasonInput('');
      await loadOwners();
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to ${actionType} owner`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOwners = owners.filter((o) => {
    const status = o.ownerVerificationStatus || 'pending';
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      o.name.toLowerCase().includes(query) ||
      o.email.toLowerCase().includes(query) ||
      o.phone.toLowerCase().includes(query) ||
      (o.turfs && o.turfs.some((t: any) => t.turfName.toLowerCase().includes(query)));
    return matchesStatus && matchesSearch;
  });

  const pendingCount = owners.filter((o) => (o.ownerVerificationStatus || 'pending') === 'pending').length;
  const approvedCount = owners.filter((o) => o.ownerVerificationStatus === 'approved').length;
  const rejectedCount = owners.filter((o) => o.ownerVerificationStatus === 'rejected').length;
  const suspendedCount = owners.filter((o) => o.ownerVerificationStatus === 'suspended').length;

  return (
    <div className="space-y-6" id="owner-verification-panel">
      {/* Overview KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center justify-between">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Awaiting verification</div>
        </button>

        <button
          onClick={() => setStatusFilter('approved')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'approved'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
            <span>Approved Owners</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{approvedCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Full operational access</div>
        </button>

        <button
          onClick={() => setStatusFilter('suspended')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'suspended'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center justify-between">
            <span>Suspended</span>
            <PauseCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-900 mt-1">{suspendedCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Operational access revoked</div>
        </button>

        <button
          onClick={() => setStatusFilter('rejected')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'rejected'
              ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
            <span>Rejected</span>
            <XCircle className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{rejectedCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Denied applications</div>
        </button>
      </div>

      {/* Notifications / Alerts */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between animate-fadeIn">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900">×</button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center justify-between animate-fadeIn">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-rose-600 hover:text-rose-900">×</button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-card">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by owner name, phone, email, or arena name..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses ({owners.length})</option>
              <option value="pending">Pending ({pendingCount})</option>
              <option value="approved">Approved ({approvedCount})</option>
              <option value="suspended">Suspended ({suspendedCount})</option>
              <option value="rejected">Rejected ({rejectedCount})</option>
            </select>
          </div>

          <button
            onClick={loadOwners}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh application list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-7 h-7 text-[#0FA958] animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#64748B]">Loading owner verification queue from database...</p>
        </div>
      ) : filteredOwners.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#0F172A]">No Owner Applications Found</h3>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
            {statusFilter === 'pending'
              ? 'There are currently no turf owner applications pending administrator review.'
              : `No accounts matching status "${statusFilter}" were found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOwners.map((owner) => {
            const status = owner.ownerVerificationStatus || 'pending';
            const isPending = status === 'pending';
            const isApproved = status === 'approved';
            const isSuspended = status === 'suspended';
            const isRejected = status === 'rejected';

            return (
              <div
                key={owner.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card hover:border-slate-300 transition-all"
                id={`owner-app-${owner.id}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Applicant details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-[#0F172A]">{owner.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">ID #{owner.id}</span>

                      {/* Status Badge */}
                      {isPending && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pending Review
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Approved &amp; Operational
                        </span>
                      )}
                      {isSuspended && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                          <PauseCircle className="w-3 h-3 text-rose-600" />
                          Suspended
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-slate-600" />
                          Rejected
                        </span>
                      )}
                    </div>

                    {/* Contact & Meta */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono">{owner.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{owner.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          Applied:{' '}
                          {owner.ownerSubmittedAt
                            ? new Date(owner.ownerSubmittedAt).toLocaleDateString()
                            : new Date(owner.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Turfs associated */}
                    {owner.turfs && owner.turfs.length > 0 ? (
                      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#0FA958]" />
                          Associated Facility Listings ({owner.turfs.length})
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                          {owner.turfs.map((t: any) => (
                            <div key={t.id} className="text-xs bg-white p-2 rounded-lg border border-slate-200">
                              <div className="font-bold text-[#0F172A]">{t.turfName}</div>
                              <div className="text-[11px] text-slate-500 truncate">{t.address}, {t.city}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">No arena registered yet under this owner account.</div>
                    )}

                    {/* Rejection / Suspension Reason display if present */}
                    {isRejected && owner.ownerRejectionReason && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                        <strong className="text-slate-900">Rejection Reason:</strong> {owner.ownerRejectionReason}
                      </div>
                    )}
                    {isSuspended && owner.ownerSuspensionReason && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                        <strong>Suspension Reason:</strong> {owner.ownerSuspensionReason}
                      </div>
                    )}
                  </div>

                  {/* Right: Admin Action Buttons */}
                  <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 justify-end">
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleApprove(owner.id)}
                          disabled={actionLoading === owner.id}
                          className="px-4 py-2 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-soft cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve Owner</span>
                        </button>

                        <button
                          onClick={() => openActionModal(owner, 'reject')}
                          disabled={actionLoading === owner.id}
                          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-rose-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject Application</span>
                        </button>
                      </>
                    )}

                    {isApproved && (
                      <button
                        onClick={() => openActionModal(owner, 'suspend')}
                        disabled={actionLoading === owner.id}
                        className="px-4 py-2 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <PauseCircle className="w-3.5 h-3.5" />
                        <span>Suspend Privileges</span>
                      </button>
                    )}

                    {isSuspended && (
                      <button
                        onClick={() => handleReactivate(owner.id)}
                        disabled={actionLoading === owner.id}
                        className="px-4 py-2 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-soft cursor-pointer disabled:opacity-50"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Reactivate Owner</span>
                      </button>
                    )}

                    {isRejected && (
                      <button
                        onClick={() => handleApprove(owner.id)}
                        disabled={actionLoading === owner.id}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Re-evaluate &amp; Approve</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection / Suspension Modal with Mandatory Reason */}
      {modalOwner && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  actionType === 'reject' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#0F172A]">
                  {actionType === 'reject' ? 'Reject Owner Application' : 'Suspend Owner Privileges'}
                </h3>
                <p className="text-xs text-slate-500">Applicant: {modalOwner.name} ({modalOwner.email})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {actionType === 'reject'
                ? 'Please specify a clear reason for rejecting this application. This reason will be recorded in the audit log and displayed to the owner.'
                : 'Suspension immediately revokes operational access to the Owner Dashboard, slots, and payouts. A justification is required.'}
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for {actionType === 'reject' ? 'Rejection' : 'Suspension'} *
              </label>
              <textarea
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                rows={3}
                placeholder={
                  actionType === 'reject'
                    ? 'e.g. Invalid trade license / Unable to verify pitch ownership documents'
                    : 'e.g. Safety complaint investigation / Outstanding dispute'
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-[#0F172A] focus:outline-none focus:border-[#0FA958] focus:bg-white"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setModalOwner(null);
                  setActionType(null);
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={actionLoading === modalOwner.id || !reasonInput.trim()}
                className={`px-4 py-2 text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50 ${
                  actionType === 'reject' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionLoading === modalOwner.id ? 'Processing...' : `Confirm ${actionType === 'reject' ? 'Rejection' : 'Suspension'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
