import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  ShieldAlert,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  FileText,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export const OwnerVerificationStatusView: React.FC = () => {
  const { currentUser, setCurrentUser, setActiveTab } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const status = currentUser?.ownerVerificationStatus || 'pending';

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    setStatusMessage(null);
    try {
      const updatedUser = await api.getCurrentUser();
      setCurrentUser(updatedUser);
      if (updatedUser.ownerVerificationStatus === 'approved') {
        setStatusMessage('Congratulations! Your account has been approved. You now have full operational access.');
      } else {
        setStatusMessage(`Status checked: Currently '${updatedUser.ownerVerificationStatus || 'pending'}'.`);
      }
    } catch (err: any) {
      console.error('Failed to refresh owner status:', err);
      setStatusMessage('Unable to connect to server. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12" id="owner-verification-status-container">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
        {/* Header Banner */}
        <div
          className={`p-6 sm:p-8 text-center border-b ${
            status === 'pending'
              ? 'bg-amber-50/70 border-amber-200'
              : status === 'rejected'
              ? 'bg-red-50/70 border-red-200'
              : 'bg-rose-50/70 border-rose-200'
          }`}
        >
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border shadow-sm ${
              status === 'pending'
                ? 'bg-amber-100 text-amber-700 border-amber-300'
                : status === 'rejected'
                ? 'bg-red-100 text-red-700 border-red-300'
                : 'bg-rose-100 text-rose-700 border-rose-300'
            }`}
          >
            {status === 'pending' && <Clock className="w-8 h-8 animate-pulse text-amber-600" />}
            {status === 'rejected' && <XCircle className="w-8 h-8 text-red-600" />}
            {status === 'suspended' && <ShieldAlert className="w-8 h-8 text-rose-600" />}
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] mb-2">
            {status === 'pending' && 'Turf Owner Verification Pending'}
            {status === 'rejected' && 'Owner Application Not Approved'}
            {status === 'suspended' && 'Operational Access Suspended'}
          </h1>

          <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto leading-relaxed">
            {status === 'pending' &&
              'Your Turf Owner account requires manual review and approval by TurfBD administrators before operational dashboard features are unlocked.'}
            {status === 'rejected' &&
              'Your application to become a verified Turf Owner was reviewed and rejected by the platform administrators.'}
            {status === 'suspended' &&
              'Your operational owner privileges have been suspended. You cannot edit venues, manage bookings, or access finances.'}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {statusMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Status Specific Details */}
          {status === 'pending' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-3">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0FA958]" />
                  <span>Applicant Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Owner Name:</span>
                    <strong className="text-slate-900">{currentUser?.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Contact Phone:</span>
                    <strong className="text-slate-900">{currentUser?.phone}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Email Address:</span>
                    <strong className="text-slate-900">{currentUser?.email}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Submission Date:</span>
                    <strong className="text-slate-900">
                      {currentUser?.ownerSubmittedAt
                        ? new Date(currentUser.ownerSubmittedAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : new Date().toLocaleDateString('en-GB')}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="font-bold text-amber-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>What happens during verification?</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px] leading-relaxed">
                  <li>Platform administrators confirm physical venue address and turf specifications</li>
                  <li>Proof of ground management authorization or trade license is inspected</li>
                  <li>Payout details (bKash/Nagad/Bank) are pre-validated for secure disbursements</li>
                </ul>
                <p className="text-[11px] text-amber-700/90 pt-1">
                  Estimated review turnaround: <strong>12 to 24 business hours</strong>.
                </p>
              </div>
            </div>
          )}

          {status === 'rejected' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
                <div className="font-bold text-red-900 flex items-center gap-2 text-xs">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>Platform Rejection Reason</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-red-200 text-xs font-medium text-red-800 leading-relaxed">
                  {currentUser?.ownerRejectionReason ||
                    'Ground details or submitted contact information could not be verified by platform compliance.'}
                </div>
                {currentUser?.ownerReviewedAt && (
                  <div className="text-[10px] text-red-600/80">
                    Reviewed on:{' '}
                    {new Date(currentUser.ownerReviewedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-1.5">
                <span className="font-bold text-slate-800 block">How to appeal or update info:</span>
                <p className="text-[11px] leading-relaxed">
                  If you believe this was an error or wish to provide corrected venue documents, please contact TurfBD Owner Operations at{' '}
                  <strong className="text-slate-900">support@turfbd.com</strong> or call hotline{' '}
                  <strong className="text-slate-900">+880 1912 334455</strong>.
                </p>
              </div>
            </div>
          )}

          {status === 'suspended' && (
            <div className="space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
                <div className="font-bold text-rose-900 flex items-center gap-2 text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Platform Suspension Notice</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-rose-200 text-xs font-medium text-rose-800 leading-relaxed">
                  {currentUser?.ownerSuspensionReason ||
                    'Operations temporarily suspended due to pending account verification or administrative policy review.'}
                </div>
                {currentUser?.ownerSuspendedAt && (
                  <div className="text-[10px] text-rose-600/80">
                    Suspended on:{' '}
                    {new Date(currentUser.ownerSuspendedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-1.5">
                <span className="font-bold text-slate-800 block">Immediate Assistance:</span>
                <p className="text-[11px] leading-relaxed">
                  To restore operational status, please reach out to the TurfBD Security and Operations Desk at{' '}
                  <strong className="text-slate-900">compliance@turfbd.com</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveTab('home')}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer text-center"
            >
              Explore Matches as Player
            </button>

            <button
              onClick={handleRefreshStatus}
              disabled={refreshing}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-soft transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Check Verification Status</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
