import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Waves,
  MapPin,
  Compass,
  CloudRain,
  Activity,
  AlertTriangle,
  FileText,
  Menu,
  X,
  Bell,
  Search,
  LifeBuoy,
  Hospital,
  HeartPulse,
  Anchor,
  User,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface NavbarProps {
  onOpenCheckArea: () => void;
  onOpenNotifications: () => void;
  onOpenSupport?: () => void;
  onOpenAuth?: () => void;
  notificationCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCheckArea,
  onOpenNotifications,
  onOpenSupport,
  onOpenAuth,
  notificationCount = 2,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/', label: t('nav.home', 'Home'), icon: Waves },
    { to: '/map', label: t('nav.map', 'Flood Map'), icon: MapPin },
    { to: '/rescue', label: 'Rescue Tracker', icon: LifeBuoy },
    { to: '/forecasts', label: t('nav.forecasts', 'Forecasts'), icon: CloudRain },
    { to: '/safe-routes', label: t('nav.safeRoutes', 'Safe Routes'), icon: Compass },
    { to: '/coastal-marine', label: 'Fishermen & Coastal', icon: Anchor },
    { to: '/rivers', label: t('nav.rivers', 'River Telemetry'), icon: Activity },
    { to: '/facilities', label: 'Shelters', icon: Hospital },
    { to: '/reports', label: t('nav.report', 'Report Flooding'), icon: AlertTriangle },
    { to: '/data-sources', label: t('nav.about', 'Sources'), icon: FileText },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Product Identity */}
          <Link to="/" className="flex items-center gap-2.5 group focus:outline-hidden">
            <div className="w-9 h-9 rounded-lg bg-[#101820] flex items-center justify-center text-[#B79A62] shadow-sm group-hover:bg-[#263746] transition-colors">
              <Waves className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-base sm:text-lg tracking-tight text-[#101820] flex items-center gap-1">
                <span>JalDrishti</span>
                <span className="text-[#B79A62]">India</span>
              </div>
              <p className="text-[9px] text-gray-500 tracking-wider uppercase font-semibold">
                National Flood Intelligence
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold tracking-tight transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-[#101820] border-b-2 border-[#B79A62]'
                      : 'text-gray-600 hover:text-[#101820] hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#B79A62]' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            {/* Dos & Don'ts link */}
            <button
              onClick={() => alert('See Safety Guidelines')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold tracking-tight transition-colors text-gray-600 hover:text-[#101820] hover:bg-gray-50"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
              <span>Dos &amp; Don'ts</span>
            </button>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Auth button */}
            {user === null ? (
              <button
                onClick={() => onOpenAuth?.()}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 text-xs font-bold transition-all"
                title="Sign In"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-800">{user.full_name || user.email}</span>
                {user.role === 'admin' ? (
                  <span className="text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 rounded-full px-2 py-0.5">
                    🛡️ Admin
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
                    👤 Citizen
                  </span>
                )}
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* First Technical Support / Emergency SOS Button */}
            {onOpenSupport && (
              <button
                onClick={onOpenSupport}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-all"
                title="Emergency Helplines & First-Aid Guides"
              >
                <HeartPulse className="w-3.5 h-3.5 text-red-600" />
                <span>Emergency SOS</span>
              </button>
            )}

            {/* Check My Area Primary Button */}
            <button
              onClick={onOpenCheckArea}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#B79A62] hover:bg-[#a68953] text-[#101820] text-xs font-bold uppercase tracking-wider shadow-xs transition-all active:scale-98"
            >
              <Search className="w-3.5 h-3.5 text-[#101820]" />
              <span className="hidden sm:inline">{t('nav.checkMyArea', 'Check Area')}</span>
              <span className="sm:hidden">Search</span>
            </button>

            {/* Notifications button */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title="Notifications"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-lg">
          {/* Auth row in mobile */}
          {user === null ? (
            <button
              onClick={() => { onOpenAuth?.(); setMobileMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-gray-100 text-gray-800 text-xs font-bold mb-2 border border-gray-300"
            >
              <User className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          ) : (
            <div className="flex items-center justify-between px-2 py-2 bg-gray-50 rounded-md mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-800">{user.full_name || user.email}</span>
                {user.role === 'admin' ? (
                  <span className="text-[10px] font-bold bg-red-100 text-red-700 rounded-full px-2 py-0.5">🛡️ Admin</span>
                ) : (
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">👤 Citizen</span>
                )}
              </div>
              <button onClick={logout} className="p-1 text-gray-500 hover:text-red-600">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {onOpenSupport && (
            <button
              onClick={() => {
                onOpenSupport();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-red-600 text-white text-xs font-bold uppercase tracking-wider mb-2 shadow-xs"
            >
              <HeartPulse className="w-4 h-4" />
              <span>Emergency SOS & First-Aid</span>
            </button>
          )}

          <button
            onClick={() => {
              onOpenCheckArea();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#B79A62] text-[#101820] text-xs font-bold uppercase tracking-wider mb-3 shadow-xs"
          >
            <Search className="w-4 h-4 text-[#101820]" />
            <span>{t('nav.checkMyArea', 'Check My Area')}</span>
          </button>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold ${
                  isActive
                    ? 'bg-gray-100 text-[#101820] font-bold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#B79A62]' : 'text-gray-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => { alert('See Safety Guidelines'); setMobileMenuOpen(false); }}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 w-full"
          >
            <ShieldCheck className="w-4 h-4 text-gray-500" />
            <span>Dos &amp; Don'ts</span>
          </button>
        </div>
      )}
    </header>
  );
};
