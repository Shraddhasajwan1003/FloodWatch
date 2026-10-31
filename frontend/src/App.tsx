import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { UtilityBar } from '@/components/UtilityBar';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CheckAreaModal } from '@/components/CheckAreaModal';
import { NotificationsDrawer } from '@/components/NotificationsDrawer';
import { AIAssistantModal } from '@/components/AIAssistantModal';

// Pages
import { HomePage } from '@/pages/HomePage';
import { MapPage } from '@/pages/MapPage';
import { ForecastPage } from '@/pages/ForecastPage';
import { SafeRoutesPage } from '@/pages/SafeRoutesPage';
import { RiversPage } from '@/pages/RiversPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { FacilitiesPage } from '@/pages/FacilitiesPage';
import { DataSourcesPage } from '@/pages/DataSourcesPage';

export const App: React.FC = () => {
  const [isCheckAreaOpen, setIsCheckAreaOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F8] text-[#101820]">
      {/* Top Utility Bar */}
      <UtilityBar onOpenDataSources={() => (window.location.href = '/data-sources')} />

      {/* Primary Civic Navbar */}
      <Navbar
        onOpenCheckArea={() => setIsCheckAreaOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        notificationCount={2}
      />

      {/* Main Page Body */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/forecasts" element={<ForecastPage />} />
          <Route path="/safe-routes" element={<SafeRoutesPage />} />
          <Route path="/rivers" element={<RiversPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/facilities" element={<FacilitiesPage />} />
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

      <AIAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
    </div>
  );
};

export default App;
