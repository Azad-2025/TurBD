import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TurfBDLogo } from './TurfBDLogo';
import { NotificationBell } from './NotificationBell';
import { NotificationHistoryModal } from './NotificationHistoryModal';
import { MobileAppHeader } from './MobileAppHeader';
import { PWAInstallBanner } from './PWAInstallBanner';
import { DesktopAppModal } from './DesktopAppModal';
import { GateCheckInModal } from './GateCheckInModal';
import { UserAvatar } from './UserAvatar';
import { usePWAInstall } from '../utils/usePWAInstall';
import {
  Calendar,
  ShieldCheck,
  Building2,
  Compass,
  User as UserIcon,
  LogOut,
  ChevronDown,
  MapPin,
  Download,
  Monitor,
  Scan,
  Eye,
} from 'lucide-react';
import { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    logout,
    activeTab,
    setActiveTab,
    setIsAuthModalOpen,
    setAuthMode,
    searchFilters,
    setSearchFilters,
    realtimeConnected,
    previewRole,
    setPreviewRole,
    turfs,
    refreshBookings,
  } = useApp();

  const [isNotificationHistoryOpen, setIsNotificationHistoryOpen] = useState(false);
  const [isDesktopModalOpen, setIsDesktopModalOpen] = useState(false);
  const [isGateCheckInOpen, setIsGateCheckInOpen] = useState(false);
  const [isPreviewMenuOpen, setIsPreviewMenuOpen] = useState(false);
  const { isElectron } = usePWAInstall();

  return (
    <>
      {/* =========================================================================
          1. MOBILE VIEW (< 768px): Dedicated Mobile App Header
         ========================================================================= */}
      <div className="block md:hidden">
        <MobileAppHeader />
      </div>

      {/* =========================================================================
          2. DESKTOP & TABLET VIEW (>= 768px): Full Website Navigation Bar
         ========================================================================= */}
      <header className="hidden md:block sticky top-0 z-40 bg-white/95 dark:bg-[#0B1315]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/90 shadow-xs pt-[env(safe-area-inset-top,0px)] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Logo & City Selector */}
            <div className="flex items-center gap-4 sm:gap-6 shrink-0">
              <button
                onClick={() => setActiveTab('home')}
                className="flex items-center group cursor-pointer focus:outline-none active:scale-95 transition-transform shrink-0"
                id="brand-logo-btn"
                title="TurfBD - Sports Turf Booking"
              >
                <TurfBDLogo
                  layout="horizontal"
                  size="md"
                  variant="brand"
                  showTagline={false}
                  showBadge={true}
                  badgeText="Sports"
                  id="desktop-brand-logo"
                />
              </button>

              {/* Quick City Dropdown Pill */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 shadow-2xs">
                <MapPin className="w-3.5 h-3.5 text-[#0FA958]" />
                <select
                  value={searchFilters.city}
                  onChange={(e) =>
                    setSearchFilters((prev) => ({
                      ...prev,
                      city: e.target.value,
                      area: 'All Areas',
                    }))
                  }
                  className="bg-transparent border-none text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer pr-1"
                  id="header-city-select"
                >
                  <option value="All Cities">All BD (Entire Country)</option>
                  <option value="Dhaka">Dhaka</option>
                  <option value="Chattogram">Chattogram</option>
                  <option value="Sylhet">Sylhet</option>
                </select>
              </div>
            </div>

            {/* Centered Rounded Desktop Navigation Menu */}
            <nav className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-full border border-slate-200/90 dark:border-slate-700/80 shadow-2xs" id="desktop-centered-nav">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'home' || activeTab === 'browse'
                    ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-300 shadow-2xs font-extrabold border border-slate-200/50 dark:border-slate-700/50'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
                id="nav-browse-btn"
              >
                <Compass className="w-3.5 h-3.5 text-[#0FA958]" />
                <span>Explore Turfs</span>
              </button>

              <button
                onClick={() => setActiveTab('my-bookings')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'my-bookings'
                    ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-300 shadow-2xs font-extrabold border border-slate-200/50 dark:border-slate-700/50'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
                id="nav-bookings-btn"
              >
                <Calendar className="w-3.5 h-3.5 text-[#0FA958]" />
                <span>My Bookings</span>
              </button>

              {/* Turf Owner Portal (Visible if approved owner, admin, or previewing owner) */}
              {(previewRole === 'owner' || (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin'))) && previewRole !== 'customer' && (
                <button
                  onClick={() => setActiveTab('owner-dashboard')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'owner-dashboard'
                      ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-300 shadow-2xs font-extrabold border border-slate-200/50 dark:border-slate-700/50'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                  }`}
                  id="nav-owner-btn"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#0FA958]" />
                  <span>Owner Dashboard</span>
                </button>
              )}

              {/* Admin Command Center (Restricted to actual admin accounts, hidden in preview) */}
              {currentUser && currentUser.role === 'admin' && !previewRole && (
                <button
                  onClick={() => setActiveTab('admin-panel')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'admin-panel'
                      ? 'bg-purple-600 text-white shadow-2xs font-extrabold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                  }`}
                  id="nav-admin-btn"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-200" />
                  <span>Admin Panel</span>
                </button>
              )}

              {/* Super Admin Safe View Preview Selector */}
              {currentUser && currentUser.role === 'admin' && currentUser.isSuperAdmin && (
                <div className="relative">
                  <button
                    onClick={() => setIsPreviewMenuOpen(!isPreviewMenuOpen)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      previewRole
                        ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                    title="Safely preview interface layouts for different roles"
                  >
                    <Eye className="w-3.5 h-3.5 text-purple-600" />
                    <span>{previewRole ? `Preview: ${previewRole}` : 'Preview View'}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {isPreviewMenuOpen && (
                    <div className="absolute top-full mt-1.5 left-0 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-fadeIn">
                      <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Role View Simulation
                      </div>
                      <button
                        onClick={() => {
                          setPreviewRole('customer');
                          setIsPreviewMenuOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                          previewRole === 'customer' ? 'font-bold text-[#0FA958]' : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span>👥 Customer View</span>
                        {previewRole === 'customer' && <span className="text-[10px]">Active</span>}
                      </button>
                      <button
                        onClick={() => {
                          setPreviewRole('owner');
                          setIsPreviewMenuOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                          previewRole === 'owner' ? 'font-bold text-amber-600' : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span>🏟️ Turf Owner View</span>
                        {previewRole === 'owner' && <span className="text-[10px]">Active</span>}
                      </button>
                      {previewRole && (
                        <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                          <button
                            onClick={() => {
                              setPreviewRole(null);
                              setIsPreviewMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 text-xs font-bold text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors"
                          >
                            🛡️ Exit Preview (Admin)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </nav>

            {/* Right Side: PWA Button, Windows App Button, Notifications, Real Role Badge, Profile & Logout */}
            <div className="flex items-center gap-2.5">
              {/* Gate Check-In Quick Button for Owners & Admins */}
              {currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin') && (
                <button
                  onClick={() => setIsGateCheckInOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#064E3B] dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer shadow-2xs"
                  title="Gate Check-In / Scan Match QR"
                  id="nav-gate-checkin-btn"
                >
                  <Scan className="w-3.5 h-3.5 text-[#0FA958]" />
                  <span className="hidden md:inline">Gate Scan</span>
                </button>
              )}

              {/* Compact PWA Install button */}
              <PWAInstallBanner compact={true} />

              {/* Windows Desktop App Button (Only in web browser, hidden inside Electron desktop app) */}
              {!isElectron && (
                <button
                  onClick={() => setIsDesktopModalOpen(true)}
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#064E3B] dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title="Download TurfBD for Windows (TurfBD-Setup.exe)"
                  id="nav-desktop-app-btn"
                >
                  <Monitor className="w-3.5 h-3.5 text-[#0FA958]" />
                  <span>Windows App</span>
                </button>
              )}

              {/* Verified Server-Determined Role Badge (Read-Only) */}
              {currentUser && (
                <div
                  className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                    currentUser.role === 'admin'
                      ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                      : currentUser.role === 'owner'
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-[#064E3B] dark:text-emerald-300'
                  }`}
                  id="verified-role-badge"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      currentUser.role === 'admin'
                        ? 'bg-purple-500'
                        : currentUser.role === 'owner'
                        ? 'bg-amber-500'
                        : 'bg-[#0FA958]'
                    }`}
                  />
                  <span>
                    {currentUser.role === 'admin'
                      ? currentUser.isSuperAdmin
                        ? 'Super Admin'
                        : 'Platform Admin'
                      : currentUser.role === 'owner'
                      ? 'Turf Owner'
                      : 'Customer'}
                  </span>
                </div>
              )}

              {/* Notification Bell with Badge & Dropdown */}
              <NotificationBell onOpenHistory={() => setIsNotificationHistoryOpen(true)} />

              {/* Real Authentication: Profile & Logout or Sign In / Register */}
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    title="My Profile"
                    id="nav-profile-btn"
                  >
                    <UserAvatar name={currentUser.name} avatar={currentUser.avatar} size="sm" shape="circle" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 max-w-[100px] truncate hidden lg:inline">
                      {currentUser.name.split(' ')[0]}
                    </span>
                  </button>

                  <button
                    onClick={logout}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                    title="Sign Out"
                    aria-label="Sign Out"
                    id="nav-logout-btn"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setAuthMode('signin');
                      setIsAuthModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#0FA958] transition-colors cursor-pointer"
                    id="header-signin-btn"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('signup');
                      setIsAuthModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold bg-[#0FA958] hover:bg-[#0da052] text-white rounded-xl transition-all shadow-sm shadow-[#0FA958]/25 cursor-pointer"
                    id="header-register-btn"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notification Full History Modal / Drawer */}
        <NotificationHistoryModal
          isOpen={isNotificationHistoryOpen}
          onClose={() => setIsNotificationHistoryOpen(false)}
        />

        {/* Windows Desktop Application Installer Modal */}
        <DesktopAppModal
          isOpen={isDesktopModalOpen}
          onClose={() => setIsDesktopModalOpen(false)}
        />

        {/* Gate Check-In & Match Pass Scanner Modal */}
        {isGateCheckInOpen && (
          <GateCheckInModal
            turfs={
              currentUser?.role === 'admin'
                ? turfs
                : turfs.filter((t) => t.ownerId === currentUser?.id)
            }
            onClose={() => setIsGateCheckInOpen(false)}
            onCheckInComplete={() => refreshBookings()}
          />
        )}
      </header>
    </>
  );
};
