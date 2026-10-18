import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { AppNotification } from '../types';
import { TurfBDLogo } from './TurfBDLogo';
import {
  Bell,
  CheckCheck,
  Trash2,
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Building2,
  MapPin,
  RefreshCw,
  X,
  Search,
  Filter,
} from 'lucide-react';

interface NotificationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationHistoryModal: React.FC<NotificationHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, setActiveTab } = useApp();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'owner' | 'admin'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications({
        userId: currentUser?.id ? Number(currentUser.id) : 1,
        role: currentUser?.role || 'customer',
        limit: 100,
      });
      if (res.success) {
        setNotifications(res.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load notification history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, currentUser?.id, currentUser?.role]);

  if (!isOpen) return null;

  const handleMarkRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead({
        userId: currentUser?.id ? Number(currentUser.id) : 1,
        role: currentUser?.role || 'customer',
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeedSamples = async () => {
    try {
      setIsSeeding(true);
      await api.seedSampleNotifications(currentUser?.id ? Number(currentUser.id) : 1);
      await loadNotifications();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredItems = notifications.filter((n) => {
    if (unreadOnly && n.isRead) return false;
    if (roleFilter === 'customer' && n.recipientRole !== 'customer' && n.recipientRole !== 'all') return false;
    if (roleFilter === 'owner' && n.recipientRole !== 'owner') return false;
    if (roleFilter === 'admin' && n.recipientRole !== 'admin') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchMsg = n.message.toLowerCase().includes(q);
      const matchTurf = n.metadata?.turfName?.toLowerCase().includes(q);
      const matchCode = n.metadata?.bookingCode?.toLowerCase().includes(q);
      return matchTitle || matchMsg || matchTurf || matchCode;
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#0F172A]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <TurfBDLogo layout="icon-only" size="sm" variant="light" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#0F172A]">Notification History</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#064E3B] border border-emerald-200 text-xs font-bold">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Official audit log of bookings, advance token payments, cancellations &amp; alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#064E3B] border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark All as Read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by turf, booking ID, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] placeholder-slate-400 text-xs focus:outline-none focus:border-[#0FA958] focus:bg-white"
            />
          </div>

          {/* Role & Read Status Pills */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {(['all', 'customer', 'owner', 'admin'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-xl font-semibold capitalize transition-colors cursor-pointer ${
                  roleFilter === role
                    ? 'bg-emerald-50 text-[#064E3B] border border-emerald-200 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200'
                }`}
              >
                {role === 'customer' ? 'Player' : role === 'owner' ? 'Owner' : role}
              </button>
            ))}

            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                unreadOnly
                  ? 'bg-emerald-50 text-[#064E3B] border border-emerald-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200'
              }`}
            >
              Unread Only
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F7FAF8]">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-[#0FA958]" />
              <span>Loading notification history...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <Bell className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No matching notifications found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Try adjusting your search query or role filter, or seed sample notifications.
              </p>
              <button
                onClick={handleSeedSamples}
                disabled={isSeeding}
                className="mt-4 px-4 py-2 bg-[#0FA958] hover:bg-[#0d924c] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSeeding ? 'Generating...' : 'Seed Sample Alerts'}</span>
              </button>
            </div>
          ) : (
            filteredItems.map((item) => {
              const meta = item.metadata || {};
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-colors ${
                    item.isRead
                      ? 'bg-white border-slate-200 text-slate-700 shadow-2xs'
                      : 'bg-emerald-50/40 border-emerald-200 text-[#0F172A] shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#064E3B] flex-shrink-0">
                        <Bell className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-sm font-bold text-[#0F172A]">{item.title}</h4>
                          {!item.isRead && (
                            <span className="w-2 h-2 rounded-full bg-[#0FA958]" />
                          )}
                          <span className="text-[10px] text-slate-600 font-medium px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 capitalize">
                            {item.recipientRole}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>

                        {/* Structured details */}
                        {(meta.turfName || meta.bookingCode || meta.tokenPaid || meta.amount) && (
                          <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {meta.turfName && (
                              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                                <Building2 className="w-4 h-4 text-[#0FA958] flex-shrink-0" />
                                <span className="font-semibold">{meta.turfName}</span>
                              </div>
                            )}

                            {meta.date && meta.timeSlot && (
                              <div className="flex items-center gap-2 text-slate-500">
                                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <span>{meta.date} • {meta.timeSlot}</span>
                              </div>
                            )}

                            {meta.location && (
                              <div className="flex items-center gap-2 text-slate-500 col-span-1 sm:col-span-2">
                                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <span>{meta.location}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between col-span-1 sm:col-span-2 pt-2 border-t border-slate-200 text-[11px]">
                              {meta.bookingCode && (
                                <span className="font-mono text-[#064E3B] bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                                  #{meta.bookingCode}
                                </span>
                              )}
                              {meta.tokenPaid !== undefined && (
                                <span className="text-slate-700">
                                  Advance Paid: <strong className="text-[#0FA958]">৳{Number(meta.tokenPaid).toLocaleString()}</strong>
                                  {meta.remainingDue > 0 && ` • Due: ৳${Number(meta.remainingDue).toLocaleString()}`}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      <div className="flex items-center gap-1 mt-2">
                        {!item.isRead && (
                          <button
                            onClick={() => handleMarkRead(item.id)}
                            className="p-1.5 text-slate-400 hover:text-[#0FA958] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Mark as read"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <button
            onClick={handleSeedSamples}
            disabled={isSeeding}
            className="text-xs font-semibold text-[#0FA958] hover:text-[#064E3B] flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isSeeding ? 'Seeding...' : 'Inject Demo Alerts for Testing'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
