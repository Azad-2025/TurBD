import React, { useState } from 'react';
import {
  Activity,
  Server,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Building2,
  Users,
  Calendar,
  DollarSign,
  CreditCard,
  Radio,
  RefreshCw,
  Cpu,
  ArrowUpRight,
  Zap,
  Clock,
  Sparkles,
  Download,
} from 'lucide-react';

interface CommandCenterProps {
  onNavigateToTab?: (tab: string) => void;
}

export const CommandCenterView: React.FC<CommandCenterProps> = ({ onNavigateToTab }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState('Just now');
  const [liveLogMessage, setLiveLogMessage] = useState('Platform telemetry in sync with Dhaka edge cluster.');

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefreshedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setLiveLogMessage('All microservices and MFS webhooks verified green.');
    }, 600);
  };

  return (
    <div className="space-y-6 text-[#0F172A]" id="turfbd-command-center-root">
      {/* =========================================================================
          TOP HERO: TURFBD COMMAND CENTER & PLATFORM HEALTH SCORE (92/100)
         ========================================================================= */}
      <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-200 p-6 sm:p-8 shadow-card">
        {/* Soft natural ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Health Score Circular Dial & Platform Title */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* SVG Circular Progress Meter (92/100) */}
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="46"
                  stroke="#E2E8F0"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="46"
                  stroke="#0FA958"
                  strokeWidth="10"
                  strokeDasharray={289.0}
                  strokeDashoffset={289.0 * (1 - 0.92)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-black text-[#0F172A] font-mono tracking-tight">92</span>
                <span className="text-[10px] text-[#064E3B] font-bold block -mt-1">/100</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-[#064E3B] border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0FA958] animate-pulse" />
                  Mission Control
                </span>
                <span className="text-xs text-[#64748B]">TurfBD Platform HQ</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                TurfBD Command Center
              </h2>

              <p className="text-xs sm:text-sm text-[#64748B] max-w-xl leading-relaxed">
                Live nationwide infrastructure telemetry, transaction settlement throughput, and arena network health.
              </p>
            </div>
          </div>

          {/* Quick Refresh & Telemetry Sync */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto justify-start lg:justify-end">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-left text-xs font-mono">
              <span className="text-slate-500 block text-[10px]">LAST SYNCED</span>
              <span className="text-slate-800 font-bold">{lastRefreshedTime}</span>
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 active:scale-95 text-slate-800 text-xs font-bold rounded-2xl border border-slate-200 flex items-center gap-2 transition-all cursor-pointer shadow-soft"
              id="command-center-refresh-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0FA958]' : 'text-slate-500'}`} />
              <span>{isRefreshing ? 'Pinging Nodes...' : 'Refresh Nodes'}</span>
            </button>
          </div>
        </div>

        {/* Health Factor Telemetry Pill Bar */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">System Latency</span>
            <span className="text-sm font-bold text-[#064E3B] font-mono">14ms (Optimum)</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Payment SLA</span>
            <span className="text-sm font-bold text-[#064E3B] font-mono">99.4% Success</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Booking Throughput</span>
            <span className="text-sm font-bold text-purple-700 font-mono">100% Lock SLA</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Turf Availability</span>
            <span className="text-sm font-bold text-amber-700 font-mono">94.8% Active</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TODAY'S OVERVIEW METRICS GRID
         ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0FA958]" />
            <span>Today&apos;s Overview</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">UTC+6 Bangladesh Standard Time</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Metric 1: Active Turfs */}
          <div className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
            <div className="flex items-center justify-between text-[#64748B] text-xs mb-2">
              <span className="font-semibold">Active Turfs</span>
              <span className="p-1.5 bg-emerald-50 rounded-lg text-[#0FA958]">
                <Building2 className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl font-black text-[#0F172A] font-mono tracking-tight">
              248
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#064E3B] font-semibold mt-2">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>12 Cities Nationwide</span>
            </div>
          </div>

          {/* Metric 2: Active Users */}
          <div className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
            <div className="flex items-center justify-between text-[#64748B] text-xs mb-2">
              <span className="font-semibold">Active Users</span>
              <span className="p-1.5 bg-sky-50 rounded-lg text-sky-600">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl font-black text-[#0F172A] font-mono tracking-tight">
              45,820
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-sky-700 font-semibold mt-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+1,840 New Today</span>
            </div>
          </div>

          {/* Metric 3: Today's Bookings */}
          <div className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
            <div className="flex items-center justify-between text-[#64748B] text-xs mb-2">
              <span className="font-semibold">Today&apos;s Bookings</span>
              <span className="p-1.5 bg-purple-50 rounded-lg text-purple-600">
                <Calendar className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl font-black text-[#0F172A] font-mono tracking-tight">
              1,240
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-purple-700 font-semibold mt-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>88% Confirmed</span>
            </div>
          </div>

          {/* Metric 4: GMV Today */}
          <div className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
            <div className="flex items-center justify-between text-[#64748B] text-xs mb-2">
              <span className="font-semibold">GMV Today</span>
              <span className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-amber-600 font-mono tracking-tight">
              ৳18,50,000
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-semibold mt-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.4% vs Avg Mon</span>
            </div>
          </div>

          {/* Metric 5: Platform Revenue */}
          <div className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
            <div className="flex items-center justify-between text-[#64748B] text-xs mb-2">
              <span className="font-semibold">Platform Revenue</span>
              <span className="p-1.5 bg-emerald-50 rounded-lg text-[#0FA958]">
                <CreditCard className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-[#064E3B] font-mono tracking-tight">
              ৳92,500
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#064E3B] font-semibold mt-2">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>5% Service Fee</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          LIVE STATUS & INFRASTRUCTURE HEALTH
         ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status 1: System Online */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#064E3B]">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0FA958] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0FA958]" />
                  </span>
                  <h4 className="text-sm font-bold text-[#0F172A]">System Online</h4>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">Core Cloud Run API Nodes</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-[#064E3B] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              99.98%
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748B]">
            <span>Cluster: Asia-Southeast1</span>
            <span className="font-mono text-slate-800">14ms latency</span>
          </div>
        </div>

        {/* Status 2: Payment Gateway Active */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#064E3B]">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0FA958] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0FA958]" />
                  </span>
                  <h4 className="text-sm font-bold text-[#0F172A]">Payment Gateway Active</h4>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">bKash, Nagad &amp; Upay Merchant Webhooks</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-[#064E3B] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              Active
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748B]">
            <span>MFS Token SLA</span>
            <span className="font-mono text-slate-800">0 queued fallbacks</span>
          </div>
        </div>

        {/* Status 3: Booking Engine Healthy */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#064E3B]">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0FA958] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0FA958]" />
                  </span>
                  <h4 className="text-sm font-bold text-[#0F172A]">Booking Engine Healthy</h4>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">Real-Time Slot Lock Engine</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-[#064E3B] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              Synchronized
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748B]">
            <span>Race Condition Lock</span>
            <span className="font-mono text-slate-800">0 double-bookings</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          AUDIT STREAM & QUICK OPERATIONS DISPATCH
         ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Real-Time Platform Operations Bar</span>
            </h4>
            <p className="text-xs text-[#64748B] mt-0.5">{liveLogMessage}</p>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToTab && (
              <>
                <button
                  onClick={() => onNavigateToTab('pending-turfs')}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Review Pending Turfs
                </button>

                <button
                  onClick={() => onNavigateToTab('reports')}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Financial Audits
                </button>
              </>
            )}
          </div>
        </div>

        {/* Live Transaction Ledger Stream */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Active Settlement Escrow</span>
            <span className="text-sm font-bold text-[#0F172A] font-mono">৳6,24,000</span>
            <span className="text-[10px] text-[#64748B] block mt-0.5">Automated release post-match</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Dispute Resolution Rate</span>
            <span className="text-sm font-bold text-[#064E3B] font-mono">0.08% (&lt;0.5% SLA)</span>
            <span className="text-[10px] text-[#64748B] block mt-0.5">No flagged merchant charges</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Top Operating District</span>
            <span className="text-sm font-bold text-[#0F172A]">Dhaka North (64 Arenas)</span>
            <span className="text-[10px] text-[#64748B] block mt-0.5">Gulshan, Banani, Uttara</span>
          </div>
        </div>
      </div>
    </div>
  );
};
