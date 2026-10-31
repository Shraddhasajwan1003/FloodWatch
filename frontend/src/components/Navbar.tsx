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
} from 'lucide-react';

interface NavbarProps {
  onOpenCheckArea: () => void;
  onOpenNotifications: () => void;
  notificationCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCheckArea,
  onOpenNotifications,
  notificationCount = 2,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/', label: t('nav.home', 'Home'), icon: Waves },
    { to: '/map', label: t('nav.map', 'Flood Map'), icon: MapPin },
    { to: '/forecasts', label: t('nav.forecasts', 'Forecasts'), icon: CloudRain },
    { to: '/safe-routes', label: t('nav.safeRoutes', 'Safe Routes'), icon: Compass },
    { to: '/rivers', label: t('nav.rivers', 'River Monitoring'), icon: Activity },
    { to: '/reports', label: t('nav.report', 'Report Flooding'), icon: AlertTriangle },
    { to: '/data-sources', label: t('nav.about', 'Data Sources'), icon: FileText },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Product Identity */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-hidden">
            <div className="w-10 h-10 rounded-lg bg-[#101820] flex items-center justify-center text-[#B79A62] shadow-sm group-hover:bg-[#263746] transition-colors">
              <Waves className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight text-[#101820] flex items-center gap-1.5">
                <span>FloodWatch</span>
                <span className="text-[#B79A62]">India</span>
              </div>
              <p className="text-[10px] text-gray-700 tracking-wide uppercase font-medium">
                National Flood Intelligence Portal
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold tracking-wide transition-colors ${
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
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-3">
            {/* Notifications button */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title="Notifications"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
            </button>

            {/* Check My Area Primary Button */}
            <button
              onClick={onOpenCheckArea}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#B79A62] hover:bg-[#a68953] text-[#101820] text-xs font-bold uppercase tracking-wider shadow-xs transition-all active:scale-98"
            >
              <Search className="w-3.5 h-3.5 text-[#101820]" />
              <span>{t('nav.checkMyArea', 'Check My Area')}</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-lg">
          <button
            onClick={() => {
              onOpenCheckArea();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#B79A62] text-[#101820] text-sm font-bold uppercase tracking-wider mb-3 shadow-xs"
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium ${
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
        </div>
      )}
    </header>
  );
};
