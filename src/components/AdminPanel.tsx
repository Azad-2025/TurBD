import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Building2,
  Users,
  Calendar,
  DollarSign,
  Zap,
  MapPin,
  Search,
  ExternalLink,
  AlertTriangle,
  BarChart3,
  Filter,
  RefreshCw,
  FileText,
  Clock,
  Phone,
  Radio,
  Activity,
} from 'lucide-react';
import { Turf, Booking, UserRole } from '../types';
import { BookingDetailsModal } from './BookingDetailsModal';
import { CommandCenterView } from './admin/CommandCenterView';
import { OwnerVerificationView } from './admin/OwnerVerificationView';
import { AdminPayoutsView } from './admin/AdminPayoutsView';
import { AdminDisputesView } from './admin/AdminDisputesView';

export const AdminPanel: React.FC = () => {
  const {
    currentUser,
    turfs,
    bookings,
    users,
    setTurfStatus,
    updateTurf,
    updateUserRole,
    updateBookingStatus,
    refreshBookings,
    setActiveTab: setAppTab,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'command-center' | 'owner-verifications' | 'payouts' | 'disputes' | 'pending-turfs' | 'all-turfs' | 'bookings' | 'users' | 'reports'>('command-center');
  const [searchFilter, setSearchFilter] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Strict Super Admin Access Guard
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center" id="admin-access-denied">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-card">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-[#0F172A] mb-2">Admin Authorization Required</h2>
          <p className="text-xs text-[#64748B] mb-6 leading-relaxed">
            The TurfBD Command Center is restricted to verified Super Administrators. Your authenticated role ({currentUser?.role || 'Guest'}) does not have permission to access global audits or platform controls.
          </p>
          <button
            onClick={() => setAppTab('home')}
            className="px-5 py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  // Admin Bookings filter states
  const [bookingDateFilter, setBookingDateFilter] = useState<string>('');
  const [bookingTurfFilter, setBookingTurfFilter] = useState<string>('all');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
  const [bookingPaymentFilter, setBookingPaymentFilter] = useState<string>('all');
  const [bookingSearchQuery, setBookingSearchQuery] = useState<string>('');
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);

  useEffect(() => {
    if (activeTab === 'reports') {
      setLoadingReport(true);
      api.getReports()
        .then((data) => setReportData(data))
        .catch((err) => console.error('Failed to load reports:', err))
        .finally(() => setLoadingReport(false));
    }
  }, [activeTab]);

  // Pending approval queue
  const pendingTurfs = turfs.filter((t) => t.status === 'pending');
  const approvedTurfs = turfs.filter((t) => t.status === 'approved');

  // Overall platform metrics
  const totalVolume = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((acc, b) => acc + b.totalAmount, 0);
  const platformFeeCommission = Math.round(totalVolume * 0.05);

  // Turf moderation modal state
  const [moderationModalTurf, setModerationModalTurf] = useState<Turf | null>(null);
  const [moderationModalAction, setModerationModalAction] = useState<'reject' | 'suspend'>('reject');
  const [moderationReason, setModerationReason] = useState<string>('');
  const [moderationError, setModerationError] = useState<string | null>(null);

  const handleApprove = (turfId: string) => {
    setTurfStatus(turfId, 'approved');
  };

  const handleOpenRejectModal = (turf: Turf) => {
    setModerationModalTurf(turf);
    setModerationModalAction('reject');
    setModerationReason('');
    setModerationError(null);
  };

  const handleOpenSuspendModal = (turf: Turf) => {
    setModerationModalTurf(turf);
    setModerationModalAction('suspend');
    setModerationReason('');
    setModerationError(null);
  };

  const handleConfirmModeration = async () => {
    if (!moderationModalTurf) return;
    if (!moderationReason.trim()) {
      setModerationError(`A specific reason is required to ${moderationModalAction} this venue.`);
      return;
    }
    const targetStatus = moderationModalAction === 'reject' ? 'rejected' : 'suspended';
    await setTurfStatus(moderationModalTurf.id, targetStatus, moderationReason.trim());
    setModerationModalTurf(null);
  };

  const handleToggleFeature = (turf: Turf) => {
    updateTurf(turf.id, { isFeatured: !turf.isFeatured });
  };

  const [removingDemo, setRemovingDemo] = useState(false);
  const [demoRemovalMsg, setDemoRemovalMsg] = useState<string | null>(null);

  const handleRemoveDemoTurfs = async () => {
    if (!window.confirm('Are you sure you want to remove all demo turfs? This will permanently delete records marked isDemo: true, while leaving authentic venues, users, and financial records untouched.')) {
      return;
    }
    setRemovingDemo(true);
    setDemoRemovalMsg(null);
    try {
      const res = await api.removeDemoTurfs();
      setDemoRemovalMsg(res.message);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      alert(err?.message || 'Failed to remove demo turfs');
    } finally {
      setRemovingDemo(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-[#0F172A]" id="admin-panel-page">
      {/* Demo Removal Toast / Banner */}
      {demoRemovalMsg && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-[#064E3B] rounded-2xl text-xs font-bold flex items-center justify-between">
          <span>{demoRemovalMsg}</span>
          <button onClick={() => setDemoRemovalMsg(null)} className="text-[#064E3B] hover:opacity-80">✕</button>
        </div>
      )}

      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-card">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-[#064E3B] border border-emerald-200">
              TurfBD Platform HQ
            </span>
            <span className="text-xs text-[#64748B]">
              Logged in as Super Admin <strong className="text-[#0F172A]">{currentUser?.name}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight flex items-center gap-3">
            <span>TurfBD Command Center</span>
            <span className="px-3 py-1 bg-emerald-50 text-[#064E3B] border border-emerald-200 text-xs font-mono font-bold rounded-xl hidden sm:inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0FA958] animate-pulse" />
              <span>Health: 92/100</span>
            </span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Moderate turf registrations, audit MFS transactions, review system metrics, and manage user roles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser?.isSuperAdmin && (
            <button
              onClick={handleRemoveDemoTurfs}
              disabled={removingDemo}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Delete only records where isDemo: true, preserving authentic data"
              id="admin-remove-demo-turfs-btn"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{removingDemo ? 'Removing...' : 'Remove Demo Turfs'}</span>
            </button>
          )}

          {/* Live Status Pills */}
          <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700">
            <span className="flex items-center gap-1.5 text-[#064E3B] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#0FA958] animate-ping" />
              System Online
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5 text-[#064E3B] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#0FA958]" />
              Gateways Active
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl mb-6 overflow-x-auto shadow-card gap-1">
        <button
          onClick={() => setActiveTab('command-center')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTab === 'command-center' ? 'bg-[#064E3B] text-white shadow-soft' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
          }`}
          id="tab-command-center"
        >
          <Radio className={`w-3.5 h-3.5 ${activeTab === 'command-center' ? 'text-white' : 'text-[#0FA958]'} animate-pulse`} />
          <span>Command Center</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
            activeTab === 'command-center' ? 'bg-[#0FA958] text-white' : 'bg-emerald-50 text-[#064E3B] border border-emerald-200'
          }`}>
            92/100
          </span>
        </button>

        <button
          onClick={() => setActiveTab('owner-verifications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'owner-verifications' ? 'bg-[#064E3B] text-white shadow-soft' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
          }`}
          id="tab-owner-verifications"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Owner Verifications</span>
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'payouts' ? 'bg-[#064E3B] text-white shadow-soft' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
          }`}
          id="tab-payouts"
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Payout Requests</span>
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'disputes' ? 'bg-[#064E3B] text-white shadow-soft' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
          }`}
          id="tab-disputes"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Disputes &amp; Claims</span>
        </button>

        <button
          onClick={() => setActiveTab('pending-turfs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'pending-turfs' ? 'bg-[#064E3B] text-white shadow-soft' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
          }`}
          id="tab-pending-turfs"
        >
          <span>Pending Approvals</span>
          {pendingTurfs.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center">
              {pendingTurfs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('all-turfs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'all-turfs' ? 'bg-[#064E3B] text-white shadow-soft' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
          }`}
          id="tab-all-turfs"
        >
          All Listed Venues ({turfs.length})
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'bookings' ? 'bg-[#064E3B] text-white shadow-soft' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
          }`}
          id="tab-bookings"
        >
          Global Bookings Audit ({bookings.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'users' ? 'bg-[#064E3B] text-white shadow-soft' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
          }`}
          id="tab-users"
        >
          Registered Users &amp; Roles
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'reports' ? 'bg-[#064E3B] text-white shadow-soft' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
          }`}
          id="tab-reports"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analytics &amp; Reports</span>
        </button>
      </div>

      {/* COMMAND CENTER TAB */}
      {activeTab === 'command-center' && (
        <CommandCenterView onNavigateToTab={(tab: any) => setActiveTab(tab)} />
      )}

      {/* Platform Analytics Cards (Shown when not on main command center) */}
      {activeTab !== 'command-center' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Gross Booking Volume
            </div>
            <div className="text-2xl font-black text-[#064E3B] font-mono">
              BDT {totalVolume.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Across all Bangladesh venues</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              TurfBD Commission (5%)
            </div>
            <div className="text-2xl font-black text-[#0FA958] font-mono">
              BDT {platformFeeCommission.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Net platform service revenue</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Turf Approvals Queue
            </div>
            <div className="text-2xl font-black text-amber-600">
              {pendingTurfs.length} Pending
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {approvedTurfs.length} currently live &amp; active
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Total Matches Reserved
            </div>
            <div className="text-2xl font-black text-[#0F172A] font-mono">
              {bookings.length} Bookings
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {bookings.filter((b) => b.status === 'confirmed').length} confirmed matches
            </div>
          </div>
        </div>
      )}

      {/* OWNER VERIFICATIONS TAB */}
      {activeTab === 'owner-verifications' && (
        <OwnerVerificationView />
      )}

      {/* PAYOUT REQUESTS TAB */}
      {activeTab === 'payouts' && (
        <AdminPayoutsView />
      )}

      {/* DISPUTES & REFUND CLAIMS TAB */}
      {activeTab === 'disputes' && (
        <AdminDisputesView />
      )}

      {/* PENDING APPROVALS QUEUE */}
      {activeTab === 'pending-turfs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#0F172A]">Turfs Awaiting Platform Verification</h3>
            <span className="text-xs text-[#64748B]">
              Check ground quality, owner credentials, and pricing compliance
            </span>
          </div>

          {pendingTurfs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-2 shadow-card">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#064E3B] border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-[#0FA958]" />
              </div>
              <h4 className="text-sm font-bold text-[#0F172A]">Queue is all clear!</h4>
              <p className="text-xs text-[#64748B]">No pending turf listings waiting for admin review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingTurfs.map((turf) => (
                <div
                  key={turf.id}
                  className="bg-white border-2 border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-card"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-50 text-amber-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-amber-200">
                        Pending Verification
                      </span>
                      <h4 className="text-lg font-bold text-[#0F172A]">{turf.name}</h4>
                    </div>

                    <p className="text-xs text-slate-600 max-w-xl">{turf.description}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Location:</span>
                        <span className="text-[#0F172A] font-semibold">{turf.area}, {turf.city}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Hourly Rate:</span>
                        <span className="font-mono text-[#064E3B] font-bold">BDT {turf.hourlyRate}/hr</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Owner:</span>
                        <span className="text-[#0F172A] font-semibold">{turf.ownerName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Owner Phone:</span>
                        <span className="text-[#0F172A] font-semibold">{turf.ownerPhone}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-700 font-medium border border-slate-200">
                        Pitch: {turf.size}
                      </span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-700 font-medium border border-slate-200">
                        Surface: {turf.surface}
                      </span>
                      <div className="flex items-center gap-1">
                        {turf.sports?.map((s) => (
                          <span key={s} className="bg-emerald-50 text-[#064E3B] px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-emerald-200">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200">
                    <button
                      onClick={() => handleOpenRejectModal(turf)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-red-50 text-red-600 hover:text-red-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleApprove(turf.id)}
                      className="px-5 py-2.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve &amp; Publish Live</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ALL TURFS TAB */}
      {activeTab === 'all-turfs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#0F172A]">All Platform Turfs</h3>
            <span className="text-xs text-[#64748B]">{turfs.length} total arenas</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-card">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[#64748B] bg-slate-50">
                  <th className="p-3.5 font-semibold">Arena Name</th>
                  <th className="p-3.5 font-semibold">City &amp; Area</th>
                  <th className="p-3.5 font-semibold">Rate</th>
                  <th className="p-3.5 font-semibold">Owner Contact</th>
                  <th className="p-3.5 font-semibold">Status</th>
                  <th className="p-3.5 font-semibold">Featured</th>
                  <th className="p-3.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {turfs.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-[#0F172A]">
                      <div>{t.name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{t.size}</div>
                    </td>
                    <td className="p-3.5 text-slate-700">{t.area}, {t.city}</td>
                    <td className="p-3.5 font-mono text-[#064E3B] font-bold">BDT {t.hourlyRate}/hr</td>
                    <td className="p-3.5 text-slate-700">
                      <div>{t.ownerName}</div>
                      <div className="text-[10px] text-slate-500">{t.ownerPhone}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.status === 'approved' ? 'bg-emerald-50 text-[#064E3B] border border-emerald-200' :
                        t.status === 'pending' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleFeature(t)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                          t.isFeatured
                            ? 'bg-amber-50 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200'
                        }`}
                      >
                        {t.isFeatured ? '★ Featured' : '+ Feature'}
                      </button>
                    </td>
                    <td className="p-3.5">
                      {t.status !== 'approved' ? (
                        <button
                          onClick={() => handleApprove(t.id)}
                          className="px-2.5 py-1 bg-[#0FA958] hover:bg-[#0D944D] text-white rounded-lg font-bold text-[10px] transition-colors cursor-pointer shadow-soft"
                        >
                          Approve
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenSuspendModal(t)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg text-[10px] transition-colors cursor-pointer border border-slate-200"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GLOBAL BOOKINGS AUDIT */}
      {activeTab === 'bookings' && (
        <div className="space-y-5" id="admin-bookings-section">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
            <div>
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0FA958]" />
                <span>Global Match Bookings &amp; Financial Audit</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Monitor all turf bookings across Bangladesh with real-time filters by Date, Arena, Status, and Payment condition.
              </p>
            </div>

            <button
              onClick={() => refreshBookings()}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#0FA958]" />
              <span>Refresh Records</span>
            </button>
          </div>

          {/* FILTER BAR: Date, Turf, Status, Payment Status & Search */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-card">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]">
              <Filter className="w-4 h-4 text-[#0FA958]" />
              <span>Filter Bookings:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Date Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Match Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={bookingDateFilter}
                    onChange={(e) => setBookingDateFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-[#0F172A]"
                  />
                  {bookingDateFilter && (
                    <button
                      onClick={() => setBookingDateFilter('')}
                      className="absolute right-2 top-1.5 text-[10px] text-slate-400 hover:text-slate-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Turf Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Turf Arena</label>
                <select
                  value={bookingTurfFilter}
                  onChange={(e) => setBookingTurfFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-[#0F172A]"
                >
                  <option value="all">All Arenas ({turfs.length})</option>
                  {turfs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Booking Status</label>
                <select
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-[#0F172A]"
                >
                  <option value="all">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="cancellation_requested">Cancellation Requested</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Payment Status Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Payment Status</label>
                <select
                  value={bookingPaymentFilter}
                  onChange={(e) => setBookingPaymentFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-[#0F172A]"
                >
                  <option value="all">All Payment States</option>
                  <option value="fully_paid">Fully Paid (100%)</option>
                  <option value="advance_paid">Partially Paid (Advance)</option>
                  <option value="due_pending">Due at Pitch (&gt; BDT 0)</option>
                  <option value="refunded">Refund Processed</option>
                  <option value="refund_pending">Refund In Review</option>
                </select>
              </div>

              {/* Keyword Search */}
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Search Keywords</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={bookingSearchQuery}
                    onChange={(e) => setBookingSearchQuery(e.target.value)}
                    placeholder="Pass #, name, phone, trx..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-[#0F172A]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Filtered Results Stats */}
          {(() => {
            const filteredBookings = bookings.filter((b) => {
              // Date filter
              if (bookingDateFilter && b.date !== bookingDateFilter) return false;
              // Turf filter
              if (bookingTurfFilter !== 'all' && b.turfId !== bookingTurfFilter) return false;
              // Status filter
              if (bookingStatusFilter !== 'all' && b.status !== bookingStatusFilter) return false;
              // Payment Status filter
              if (bookingPaymentFilter === 'fully_paid' && b.dueAmount > 0) return false;
              if (bookingPaymentFilter === 'advance_paid' && (b.dueAmount === 0 || b.advancePaid === 0)) return false;
              if (bookingPaymentFilter === 'due_pending' && b.dueAmount <= 0) return false;
              if (bookingPaymentFilter === 'refunded' && b.refundStatus !== 'refunded') return false;
              if (bookingPaymentFilter === 'refund_pending' && b.status !== 'cancellation_requested') return false;
              // Search query
              if (bookingSearchQuery.trim()) {
                const q = bookingSearchQuery.toLowerCase();
                const matchCode = b.bookingCode?.toLowerCase().includes(q);
                const matchName = b.userName?.toLowerCase().includes(q);
                const matchPhone = b.userPhone?.toLowerCase().includes(q);
                const matchTrx = b.transactionId?.toLowerCase().includes(q);
                const matchTurf = b.turfName?.toLowerCase().includes(q);
                if (!matchCode && !matchName && !matchPhone && !matchTrx && !matchTurf) return false;
              }
              return true;
            });

            const filteredGross = filteredBookings
              .filter((b) => b.status !== 'cancelled')
              .reduce((acc, b) => acc + b.totalAmount, 0);

            const filteredAdvance = filteredBookings
              .filter((b) => b.status !== 'cancelled')
              .reduce((acc, b) => acc + b.advancePaid, 0);

            const filteredDue = filteredBookings
              .filter((b) => b.status !== 'cancelled')
              .reduce((acc, b) => acc + b.dueAmount, 0);

            return (
              <>
                {/* Micro KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-card">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Matches Found</div>
                    <div className="text-lg font-black text-[#0F172A]">{filteredBookings.length}</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-card">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Total Booking Value</div>
                    <div className="text-lg font-black text-[#064E3B] font-mono">BDT {filteredGross.toLocaleString()}</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-card">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Advance Paid</div>
                    <div className="text-lg font-black text-[#0FA958] font-mono">BDT {filteredAdvance.toLocaleString()}</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-card">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Pending Ground Due</div>
                    <div className="text-lg font-black text-amber-600 font-mono">BDT {filteredDue.toLocaleString()}</div>
                  </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-card">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[#64748B] bg-slate-50">
                        <th className="p-3.5 font-semibold">Pass ID</th>
                        <th className="p-3.5 font-semibold">Arena / Venue</th>
                        <th className="p-3.5 font-semibold">Booker</th>
                        <th className="p-3.5 font-semibold">Match Schedule</th>
                        <th className="p-3.5 font-semibold">Fee / Advance / Due</th>
                        <th className="p-3.5 font-semibold">MFS &amp; Trx ID</th>
                        <th className="p-3.5 font-semibold">Status</th>
                        <th className="p-3.5 font-semibold">Audit Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredBookings.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            No match bookings match your current filter parameters.
                          </td>
                        </tr>
                      ) : (
                        filteredBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5 font-mono font-bold text-[#064E3B] whitespace-nowrap">
                              #{b.bookingCode}
                            </td>
                            <td className="p-3.5 font-semibold text-[#0F172A]">
                              <div>{b.turfName}</div>
                              <div className="text-[10px] text-slate-500 font-normal">
                                {b.turfArea}, {b.turfCity}
                              </div>
                            </td>
                            <td className="p-3.5 text-slate-700">
                              <div className="font-semibold text-[#0F172A]">{b.userName}</div>
                              <div className="text-[10px] text-slate-500">{b.userPhone}</div>
                            </td>
                            <td className="p-3.5 text-slate-700 whitespace-nowrap">
                              <div className="font-semibold">{b.date}</div>
                              <div className="text-[10px] font-mono text-[#064E3B]">
                                {b.startTime} - {b.endTime} ({b.durationHours}h)
                              </div>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="font-mono text-[#0F172A] font-semibold">BDT {b.totalAmount}</div>
                              <div className="text-[10px] text-[#0FA958]">Paid: BDT {b.advancePaid}</div>
                              {b.dueAmount > 0 ? (
                                <div className="text-[10px] text-amber-600 font-semibold">Due: BDT {b.dueAmount}</div>
                              ) : (
                                <div className="text-[10px] text-slate-400">Fully Paid</div>
                              )}
                            </td>
                            <td className="p-3.5 text-slate-700 whitespace-nowrap">
                              <div className="uppercase font-bold text-xs">{b.paymentMethod}</div>
                              <div className="text-[10px] font-mono text-slate-500">
                                {b.transactionId || 'CASH AT DESK'}
                              </div>
                              {b.refundStatus && (
                                <div
                                  className={`text-[9px] font-bold uppercase mt-0.5 ${
                                    b.refundStatus === 'refunded' ? 'text-[#0FA958]' : 'text-amber-600'
                                  }`}
                                >
                                  Refund: {b.refundStatus}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  b.status === 'confirmed'
                                    ? 'bg-emerald-50 text-[#064E3B] border border-emerald-200'
                                    : b.status === 'pending_approval'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : b.status === 'cancellation_requested'
                                    ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
                                    : b.status === 'completed'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {b.status === 'cancellation_requested' ? 'Cancel Requested' : b.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setSelectedBookingForDetails(b)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-slate-200 transition-colors cursor-pointer"
                                  title="View Digital Pass & Full Breakdown"
                                >
                                  <FileText className="w-3 h-3 text-[#0FA958]" />
                                  <span>Details</span>
                                </button>

                                {b.status === 'cancellation_requested' && (
                                  <button
                                    onClick={() => {
                                      if (confirm(`Approve cancellation and refund BDT ${b.advancePaid} to ${b.userName}?`)) {
                                        updateBookingStatus(b.id, 'cancelled', {
                                          refundStatus: 'refunded',
                                          refundAmount: b.advancePaid,
                                          notes: 'Refund approved by TurfBD Super Admin',
                                        });
                                      }
                                    }}
                                    className="px-2 py-1 bg-[#0FA958] hover:bg-[#0D944D] text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
                                  >
                                    Refund
                                  </button>
                                )}

                                <a
                                  href={`tel:${b.userPhone}`}
                                  className="p-1 text-slate-400 hover:text-[#0FA958] hover:bg-slate-100 rounded transition-colors"
                                  title="Call user"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* REGISTERED USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#0F172A]">Registered Users &amp; Permission Roles</h3>
            <span className="text-xs text-[#64748B]">{users.length} registered accounts</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {users.map((u) => (
              <div key={u.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-sm text-[#064E3B]">
                    {u.avatar ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" /> : u.name[0]}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A]">{u.name}</h4>
                    <p className="text-xs text-[#64748B]">{u.email}</p>
                  </div>
                </div>

                <div className="text-xs text-slate-500 pt-1">
                  <div>Phone: <strong className="text-slate-800">{u.phone}</strong></div>
                  <div>Member Since: {u.createdAt}</div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Database Role:</span>
                    {currentUser?.id === u.id ? (
                      <span className="text-xs font-bold text-slate-400 italic">Current User</span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={async (e) => {
                          const newRole = e.target.value as UserRole;
                          try {
                            await updateUserRole(u.id, newRole);
                          } catch (err: any) {
                            alert(err?.message || 'Failed to change role');
                            console.error('Failed to change role:', err);
                          }
                        }}
                        className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg px-2 py-1 text-[#0F172A] focus:outline-none focus:border-[#0FA958]"
                      >
                        <option value="customer">Customer</option>
                        <option value="owner">Turf Owner</option>
                        {currentUser?.isSuperAdmin && (
                          <option value="admin">Platform Admin</option>
                        )}
                      </select>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      u.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                      u.role === 'owner' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-[#064E3B] border border-emerald-200'
                    }`}>
                      {u.role}
                    </span>

                    <span className="text-[11px] text-[#64748B] font-mono">
                      ID: #{u.id}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADMIN REPORTS & ANALYTICS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">System Reports &amp; Financial Ledger</h3>
              <p className="text-xs text-[#64748B]">Database verified audit metrics protected by requireAdmin() middleware</p>
            </div>
            {loadingReport && <span className="text-xs text-[#0FA958] animate-pulse">Refreshing ledger...</span>}
          </div>

          {reportData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Total Revenue Collected</div>
                  <div className="text-2xl font-black text-[#064E3B] font-mono">
                    BDT {reportData.summary.totalRevenue.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Due balance: BDT {reportData.summary.totalDue.toLocaleString()}</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Booking Conversion</div>
                  <div className="text-2xl font-black text-[#0F172A] font-mono">
                    {reportData.bookingsByStatus.confirmed} Confirmed
                  </div>
                  <div className="text-[10px] text-amber-600 mt-1">{reportData.bookingsByStatus.pending_approval} pending approval</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Venues In Network</div>
                  <div className="text-2xl font-black text-[#0FA958] font-mono">
                    {reportData.turfsByStatus.approved} Approved
                  </div>
                  <div className="text-[10px] text-amber-600 mt-1">{reportData.turfsByStatus.pending} pending verification</div>
                </div>
              </div>

              {/* User Roles Breakdown */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
                <h4 className="text-sm font-bold text-[#0F172A] mb-3">User Accounts by Role</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <div className="text-xl font-bold text-[#064E3B]">{reportData.usersByRole.customer}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Customers</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <div className="text-xl font-bold text-amber-600">{reportData.usersByRole.owner}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Turf Owners</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <div className="text-xl font-bold text-[#0FA958]">{reportData.usersByRole.admin}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Platform Admins</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-card">
              Loading platform reports...
            </div>
          )}
        </div>
      )}

      {/* Admin Booking Details & Voucher Modal */}
      {selectedBookingForDetails && (
        <BookingDetailsModal
          booking={selectedBookingForDetails}
          turf={turfs.find((t) => t.id === selectedBookingForDetails.turfId)}
          onClose={() => setSelectedBookingForDetails(null)}
          canManage={true}
        />
      )}

      {/* Turf Moderation & Reason Modal */}
      {moderationModalTurf && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {moderationModalAction === 'reject' ? (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span>Reject Turf Listing</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span>Suspend Turf Listing</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setModerationModalTurf(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Venue Name:</span>
                <span className="font-bold text-slate-900">{moderationModalTurf.name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Location:</span>
                <span className="font-bold text-slate-900">{moderationModalTurf.area}, {moderationModalTurf.city}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Owner:</span>
                <span className="font-bold text-slate-900">{moderationModalTurf.ownerName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Owner Phone:</span>
                <span className="font-mono text-slate-800">{moderationModalTurf.ownerPhone}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {moderationModalAction === 'reject'
                  ? 'Rejection Reason (Mandatory):'
                  : 'Suspension Reason (Mandatory):'}
              </label>
              <textarea
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                placeholder={
                  moderationModalAction === 'reject'
                    ? 'State specific grounds (e.g., fraudulent paperwork, fake turf photos, pricing violation)...'
                    : 'State why this active turf is suspended (e.g., persistent customer complaints, maintenance inspection)...'
                }
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0FA958]"
              />
            </div>

            {moderationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {moderationError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setModerationModalTurf(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmModeration}
                className={`px-5 py-2 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer ${
                  moderationModalAction === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                }`}
              >
                {moderationModalAction === 'reject' ? 'Confirm Rejection' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
