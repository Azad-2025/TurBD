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
} from 'lucide-react';
import { Turf, Booking, UserRole } from '../types';

export const AdminPanel: React.FC = () => {
  const {
    currentUser,
    turfs,
    bookings,
    users,
    setTurfStatus,
    updateTurf,
    switchRole,
    updateUserRole,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'pending-turfs' | 'all-turfs' | 'bookings' | 'users' | 'reports'>('pending-turfs');
  const [searchFilter, setSearchFilter] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

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

  const platformFeeCommission = Math.round(totalVolume * 0.05); // 5% platform fee

  const handleApprove = (turfId: string) => {
    setTurfStatus(turfId, 'approved');
  };

  const handleReject = (turfId: string) => {
    setTurfStatus(turfId, 'rejected');
  };

  const handleToggleFeature = (turf: Turf) => {
    updateTurf(turf.id, { isFeatured: !turf.isFeatured });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8" id="admin-panel-page">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/40">
              TurfBD Platform HQ
            </span>
            <span className="text-xs text-neutral-400">
              Logged in as Super Admin <strong className="text-white">{currentUser?.name}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            TurfBD Admin Operations
          </h1>
          <p className="text-xs text-neutral-400">
            Moderate turf registrations, audit MFS transactions, review system metrics, and manage user roles.
          </p>
        </div>

        {currentUser?.role !== 'admin' && (
          <button
            onClick={() => switchRole('admin')}
            className="px-3.5 py-2 bg-purple-500/20 text-purple-300 text-xs font-bold rounded-xl border border-purple-500/40"
          >
            Switch to Admin Persona
          </button>
        )}
      </div>

      {/* Platform Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
            Gross Booking Volume
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ৳{totalVolume.toLocaleString()}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">Across all Bangladesh venues</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
            TurfBD Commission (5%)
          </div>
          <div className="text-2xl font-black text-purple-400 font-mono">
            ৳{platformFeeCommission.toLocaleString()}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">Net platform service revenue</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
            Turf Approvals Queue
          </div>
          <div className="text-2xl font-black text-amber-400">
            {pendingTurfs.length} Pending
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">
            {approvedTurfs.length} currently live & active
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
            Total Matches Reserved
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {bookings.length} Bookings
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">
            {bookings.filter((b) => b.status === 'confirmed').length} confirmed matches
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-neutral-900 border border-neutral-800 p-1 rounded-2xl mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pending-turfs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'pending-turfs' ? 'bg-neutral-800 text-amber-400 shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>Pending Approvals</span>
          {pendingTurfs.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 font-black text-[10px] flex items-center justify-center">
              {pendingTurfs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('all-turfs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'all-turfs' ? 'bg-neutral-800 text-emerald-400 shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          All Listed Venues ({turfs.length})
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'bookings' ? 'bg-neutral-800 text-emerald-400 shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Global Bookings Audit ({bookings.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'users' ? 'bg-neutral-800 text-emerald-400 shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Registered Users & Roles
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'reports' ? 'bg-neutral-800 text-purple-400 shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analytics & Reports</span>
        </button>
      </div>

      {/* PENDING APPROVALS QUEUE */}
      {activeTab === 'pending-turfs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Turfs Awaiting Platform Verification</h3>
            <span className="text-xs text-neutral-400">
              Check ground quality, owner credentials, and pricing compliance
            </span>
          </div>

          {pendingTurfs.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Queue is all clear!</h4>
              <p className="text-xs text-neutral-400">No pending turf listings waiting for admin review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingTurfs.map((turf) => (
                <div
                  key={turf.id}
                  className="bg-neutral-900 border-2 border-amber-500/30 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-amber-500/40">
                        Pending Verification
                      </span>
                      <h4 className="text-lg font-bold text-white">{turf.name}</h4>
                    </div>

                    <p className="text-xs text-neutral-300 max-w-xl">{turf.description}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-neutral-850 p-2.5 rounded-xl border border-neutral-800">
                      <div>
                        <span className="text-neutral-500 block text-[10px]">Location:</span>
                        <span className="text-white font-semibold">{turf.area}, {turf.city}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">Hourly Rate:</span>
                        <span className="font-mono text-emerald-400 font-bold">৳{turf.hourlyRate}/hr</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">Owner:</span>
                        <span className="text-white font-semibold">{turf.ownerName}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">Owner Phone:</span>
                        <span className="text-white font-semibold">{turf.ownerPhone}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="bg-neutral-800 px-2 py-0.5 rounded text-[10px] text-neutral-300 font-medium">
                        Pitch: {turf.size}
                      </span>
                      <span className="bg-neutral-800 px-2 py-0.5 rounded text-[10px] text-neutral-300 font-medium">
                        Surface: {turf.surface}
                      </span>
                      <div className="flex items-center gap-1">
                        {turf.sports?.map((s) => (
                          <span key={s} className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-emerald-500/20">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-800">
                    <button
                      onClick={() => handleReject(turf.id)}
                      className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-red-400 hover:text-red-300 font-bold text-xs rounded-xl border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleApprove(turf.id)}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Publish Live</span>
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
            <h3 className="text-base font-bold text-white">All Platform Turfs</h3>
            <span className="text-xs text-neutral-400">{turfs.length} total arenas</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-850/50">
                  <th className="p-3.5 font-semibold">Arena Name</th>
                  <th className="p-3.5 font-semibold">City & Area</th>
                  <th className="p-3.5 font-semibold">Rate</th>
                  <th className="p-3.5 font-semibold">Owner Contact</th>
                  <th className="p-3.5 font-semibold">Status</th>
                  <th className="p-3.5 font-semibold">Featured</th>
                  <th className="p-3.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {turfs.map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-850/40">
                    <td className="p-3.5 font-bold text-white">
                      <div>{t.name}</div>
                      <div className="text-[10px] text-neutral-500 font-normal">{t.size}</div>
                    </td>
                    <td className="p-3.5 text-neutral-300">{t.area}, {t.city}</td>
                    <td className="p-3.5 font-mono text-emerald-400 font-bold">৳{t.hourlyRate}/hr</td>
                    <td className="p-3.5 text-neutral-300">
                      <div>{t.ownerName}</div>
                      <div className="text-[10px] text-neutral-500">{t.ownerPhone}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                        t.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleFeature(t)}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                          t.isFeatured
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-neutral-800 text-neutral-500 hover:text-white'
                        }`}
                      >
                        {t.isFeatured ? '★ Featured' : '+ Feature'}
                      </button>
                    </td>
                    <td className="p-3.5">
                      {t.status !== 'approved' ? (
                        <button
                          onClick={() => handleApprove(t.id)}
                          className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-neutral-950 rounded-lg font-bold text-[10px] transition-colors"
                        >
                          Approve
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReject(t.id)}
                          className="px-2.5 py-1 bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 rounded-lg text-[10px] transition-colors"
                        >
                          Deactivate
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Global Match Transactions Audit</h3>
            <span className="text-xs text-neutral-400">All bookings across Bangladesh</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-850/50">
                  <th className="p-3.5 font-semibold">Pass ID</th>
                  <th className="p-3.5 font-semibold">Venue</th>
                  <th className="p-3.5 font-semibold">Booker</th>
                  <th className="p-3.5 font-semibold">Date & Time</th>
                  <th className="p-3.5 font-semibold">Fee / Advance</th>
                  <th className="p-3.5 font-semibold">Method & Trx ID</th>
                  <th className="p-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-850/40">
                    <td className="p-3.5 font-mono font-bold text-emerald-400">#{b.bookingCode}</td>
                    <td className="p-3.5 font-semibold text-white">{b.turfName}</td>
                    <td className="p-3.5 text-neutral-300">
                      <div>{b.userName}</div>
                      <div className="text-[10px] text-neutral-500">{b.userPhone}</div>
                    </td>
                    <td className="p-3.5 text-neutral-300">
                      <div>{b.date}</div>
                      <div className="text-[10px] font-mono text-emerald-400">{b.startTime} - {b.endTime}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono text-white font-semibold">৳{b.totalAmount}</div>
                      <div className="text-[10px] text-emerald-400">Paid: ৳{b.advancePaid}</div>
                    </td>
                    <td className="p-3.5 text-neutral-300">
                      <div className="uppercase font-bold text-xs">{b.paymentMethod}</div>
                      <div className="text-[10px] font-mono text-neutral-400">{b.transactionId || 'CASH'}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        b.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                        b.status === 'pending_approval' ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-800 text-neutral-500'
                      }`}>
                        {b.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REGISTERED USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Registered Users & Permission Roles</h3>
            <span className="text-xs text-neutral-400">{users.length} registered accounts</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {users.map((u) => (
              <div key={u.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden flex items-center justify-center font-bold text-sm text-white">
                    {u.avatar ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" /> : u.name[0]}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{u.name}</h4>
                    <p className="text-xs text-neutral-400">{u.email}</p>
                  </div>
                </div>

                <div className="text-xs text-neutral-400 pt-1">
                  <div>Phone: <strong className="text-neutral-200">{u.phone}</strong></div>
                  <div>Member Since: {u.createdAt}</div>
                </div>

                <div className="pt-3 border-t border-neutral-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400">Database Role:</span>
                    <select
                      value={u.role}
                      onChange={async (e) => {
                        const newRole = e.target.value as UserRole;
                        try {
                          await updateUserRole(u.id, newRole);
                        } catch (err) {
                          console.error('Failed to change role:', err);
                        }
                      }}
                      className="bg-neutral-800 border border-neutral-700 text-xs font-bold rounded-lg px-2 py-1 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="customer">Customer</option>
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                      u.role === 'owner' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {u.role}
                    </span>

                    <button
                      onClick={() => switchRole(u.role)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      Impersonate Persona →
                    </button>
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
              <h3 className="text-base font-bold text-white">System Reports & Financial Ledger</h3>
              <p className="text-xs text-neutral-400">Database verified audit metrics protected by requireAdmin() middleware</p>
            </div>
            {loadingReport && <span className="text-xs text-purple-400 animate-pulse">Refreshing ledger...</span>}
          </div>

          {reportData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <div className="text-xs font-bold text-neutral-400 uppercase mb-1">Total Revenue Collected</div>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    ৳{reportData.summary.totalRevenue.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1">Due balance: ৳{reportData.summary.totalDue.toLocaleString()}</div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <div className="text-xs font-bold text-neutral-400 uppercase mb-1">Booking Conversion</div>
                  <div className="text-2xl font-black text-white font-mono">
                    {reportData.bookingsByStatus.confirmed} Confirmed
                  </div>
                  <div className="text-[10px] text-amber-400 mt-1">{reportData.bookingsByStatus.pending_approval} pending approval</div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <div className="text-xs font-bold text-neutral-400 uppercase mb-1">Venues In Network</div>
                  <div className="text-2xl font-black text-purple-400 font-mono">
                    {reportData.turfsByStatus.approved} Approved
                  </div>
                  <div className="text-[10px] text-amber-400 mt-1">{reportData.turfsByStatus.pending} pending verification</div>
                </div>
              </div>

              {/* User Roles Breakdown */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <h4 className="text-sm font-bold text-white mb-3">User Accounts by Role</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800 text-center">
                    <div className="text-xl font-bold text-emerald-400">{reportData.usersByRole.customer}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">Customers</div>
                  </div>
                  <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800 text-center">
                    <div className="text-xl font-bold text-amber-400">{reportData.usersByRole.owner}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">Turf Owners</div>
                  </div>
                  <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800 text-center">
                    <div className="text-xl font-bold text-purple-400">{reportData.usersByRole.admin}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">Platform Admins</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-neutral-500 bg-neutral-900 rounded-2xl border border-neutral-800">
              Loading platform reports...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
