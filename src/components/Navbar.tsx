import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  ShieldCheck,
  Building2,
  Compass,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Menu,
  X,
  PlusCircle,
  MapPin,
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
    switchRole,
    searchFilters,
    setSearchFilters,
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    switchRole(role);
    setIsRoleDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & City Selector */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              onClick={() => setActiveTab('browse')}
              className="flex items-center gap-2 group cursor-pointer focus:outline-none"
              id="brand-logo-btn"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-neutral-950 text-xl tracking-tighter shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                TBD
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xl tracking-tight text-white">Turf</span>
                  <span className="font-extrabold text-xl tracking-tight text-emerald-400">BD</span>
                  <span className="text-[10px] uppercase font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded ml-1">
                    MVP
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 font-medium leading-none">Sports Turf Booking</p>
              </div>
            </button>

            {/* Quick City Dropdown */}
            <div className="hidden md:flex items-center gap-1.5 bg-neutral-800/80 border border-neutral-700/60 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <select
                value={searchFilters.city}
                onChange={(e) => setSearchFilters((prev) => ({ ...prev, city: e.target.value }))}
                className="bg-transparent border-none text-xs text-neutral-200 focus:outline-none cursor-pointer pr-1"
                id="header-city-select"
              >
                <option value="All Cities" className="bg-neutral-900">All Bangladesh</option>
                <option value="Dhaka" className="bg-neutral-900">Dhaka</option>
                <option value="Chattogram" className="bg-neutral-900">Chattogram</option>
                <option value="Sylhet" className="bg-neutral-900">Sylhet</option>
              </select>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                activeTab === 'browse'
                  ? 'bg-neutral-800 text-emerald-400 border border-neutral-700'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800/50'
              }`}
              id="nav-browse-btn"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Turfs</span>
            </button>

            <button
              onClick={() => setActiveTab('my-bookings')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                activeTab === 'my-bookings'
                  ? 'bg-neutral-800 text-emerald-400 border border-neutral-700'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800/50'
              }`}
              id="nav-bookings-btn"
            >
              <Calendar className="w-4 h-4" />
              <span>My Bookings</span>
            </button>

            <button
              onClick={() => {
                if (currentUser?.role !== 'owner' && currentUser?.role !== 'admin') {
                  switchRole('owner');
                }
                setActiveTab('owner-dashboard');
              }}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                activeTab === 'owner-dashboard'
                  ? 'bg-neutral-800 text-emerald-400 border border-neutral-700'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800/50'
              }`}
              id="nav-owner-btn"
            >
              <Building2 className="w-4 h-4" />
              <span>Owner Dashboard</span>
            </button>

            <button
              onClick={() => {
                if (currentUser?.role !== 'admin') {
                  switchRole('admin');
                }
                setActiveTab('admin-panel');
              }}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                activeTab === 'admin-panel'
                  ? 'bg-neutral-800 text-emerald-400 border border-neutral-700'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800/50'
              }`}
              id="nav-admin-btn"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Panel</span>
            </button>
          </nav>

          {/* Right Action: Role Quick-Switcher & Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Demo Role Switcher Badge */}
            <div className="relative">
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-lg text-xs font-semibold text-neutral-200 transition-colors shadow-sm"
                title="Switch demo persona to test player, owner, or admin features"
                id="role-switcher-btn"
              >
                <span className="text-neutral-400 hidden sm:inline">Role:</span>
                <span className={`capitalize font-bold ${
                  currentUser?.role === 'admin' ? 'text-purple-400' :
                  currentUser?.role === 'owner' ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {currentUser?.role || 'Guest'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {isRoleDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-2 z-50 text-xs"
                  id="role-switcher-dropdown"
                >
                  <p className="px-2 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Switch Active Role
                  </p>
                  <button
                    onClick={() => handleRoleSelect('player')}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between font-medium transition-colors ${
                      currentUser?.role === 'player'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>⚽</span>
                      <div>
                        <div className="font-semibold">Player / Team</div>
                        <div className="text-[10px] text-neutral-400">Search & book slots</div>
                      </div>
                    </div>
                    {currentUser?.role === 'player' && <span className="text-xs">✓</span>}
                  </button>

                  <button
                    onClick={() => handleRoleSelect('owner')}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between font-medium transition-colors ${
                      currentUser?.role === 'owner'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>🏟️</span>
                      <div>
                        <div className="font-semibold">Turf Owner</div>
                        <div className="text-[10px] text-neutral-400">Manage turf & bookings</div>
                      </div>
                    </div>
                    {currentUser?.role === 'owner' && <span className="text-xs">✓</span>}
                  </button>

                  <button
                    onClick={() => handleRoleSelect('admin')}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between font-medium transition-colors ${
                      currentUser?.role === 'admin'
                        ? 'bg-purple-500/15 text-purple-400'
                        : 'text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>🛡️</span>
                      <div>
                        <div className="font-semibold">Super Admin</div>
                        <div className="text-[10px] text-neutral-400">Approve turfs & monitor</div>
                      </div>
                    </div>
                    {currentUser?.role === 'admin' && <span className="text-xs">✓</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Auth Button or User Profile */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 bg-neutral-800/80 border border-neutral-700/60 rounded-lg pl-2 pr-3 py-1">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-700 flex items-center justify-center text-xs font-bold text-white">
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      currentUser.name.charAt(0)
                    )}
                  </div>
                  <span className="text-xs font-semibold text-neutral-200 max-w-[120px] truncate">
                    {currentUser.name}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                  title="Logout"
                  id="logout-btn"
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
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                  id="header-signin-btn"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthMode('signup');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-lg transition-colors shadow-sm"
                  id="header-signup-btn"
                >
                  Register
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              id="mobile-menu-toggle"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-neutral-800 space-y-1" id="mobile-nav">
            <button
              onClick={() => {
                setActiveTab('browse');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-3 ${
                activeTab === 'browse' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-300'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Explore Turfs</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('my-bookings');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-3 ${
                activeTab === 'my-bookings' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-300'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>My Bookings</span>
            </button>

            <button
              onClick={() => {
                if (currentUser?.role !== 'owner' && currentUser?.role !== 'admin') {
                  switchRole('owner');
                }
                setActiveTab('owner-dashboard');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-3 ${
                activeTab === 'owner-dashboard' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-300'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Owner Dashboard</span>
            </button>

            <button
              onClick={() => {
                if (currentUser?.role !== 'admin') {
                  switchRole('admin');
                }
                setActiveTab('admin-panel');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-3 ${
                activeTab === 'admin-panel' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Panel</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
