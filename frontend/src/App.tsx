import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { UtilityBar } from '@/components/UtilityBar';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CheckAreaModal } from '@/components/CheckAreaModal';
import { NotificationsDrawer } from '@/components/NotificationsDrawer';
import { AIAssistantWidget } from '@/components/AIAssistantWidget';
import { SupportModal } from '@/components/SupportModal';
import { LiveAlertTicker } from '@/components/LiveAlertTicker';
import { OfflineBanner } from '@/components/OfflineBanner';
import { LiveLocationTracker } from '@/components/LiveLocationTracker';
import { AuthModal } from '@/components/AuthModal';
import { AuthProvider } from '@/context/AuthContext';

// Pages
import { HomePage } from '@/pages/HomePage';
import { MapPage } from '@/pages/MapPage';
import { ForecastPage } from '@/pages/ForecastPage';
import { SafeRoutesPage } from '@/pages/SafeRoutesPage';
import { RiversPage } from '@/pages/RiversPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { FacilitiesPage } from '@/pages/FacilitiesPage';
import { DataSourcesPage } from '@/pages/DataSourcesPage';
import { RescueTrackerPage } from '@/pages/RescueTrackerPage';
import { CoastalMarinePage } from '@/pages/CoastalMarinePage';

export const App: React.FC = () => {
  const [isCheckAreaOpen, setIsCheckAreaOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-[#F4F6F8] text-[#101820]">
        {/* Offline Sync Status Banner */}
        <OfflineBanner />

        {/* Live GPS Location Tracker */}
        <LiveLocationTracker />

        {/* Real-time Disaster Alert & Waterlogging Ticker */}
        <LiveAlertTicker />

        {/* Top Utility Bar */}
        <UtilityBar onOpenDataSources={() => (window.location.href = '/data-sources')} />

        {/* Primary Civic Navbar */}
        <Navbar
          onOpenCheckArea={() => setIsCheckAreaOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenSupport={() => setIsSupportOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          notificationCount={2}
        />

        {/* Main Page Body */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/rescue" element={<RescueTrackerPage />} />
            <Route path="/forecasts" element={<ForecastPage />} />
            <Route path="/coastal-marine" element={<CoastalMarinePage />} />
            <Route path="/safe-routes" element={<SafeRoutesPage />} />
            <Route path="/rivers" element={<RiversPage />} />
            <Route path="/facilities" element={<FacilitiesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/data-sources" element={<DataSourcesPage />} />
            {/* Fallback route */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>

        {/* Footer */}
        <Footer />

        {/* Global Modals */}
        <CheckAreaModal
          isOpen={isCheckAreaOpen}
          onClose={() => setIsCheckAreaOpen(false)}
        />

        <NotificationsDrawer
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
        />

        <SupportModal
          isOpen={isSupportOpen}
          onClose={() => setIsSupportOpen(false)}
        />

        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
        />

        {/* Global floating AI Widget */}
        <AIAssistantWidget />
      </div>
    </AuthProvider>
  );
};

export default App;
