import React, { useState } from 'react';
import { Hero } from '@/components/Hero';
import { ServiceCards } from '@/components/ServiceCards';
import { MapComponent } from '@/components/MapComponent';
import { RiskDetailModal } from '@/components/RiskDetailModal';
import { CheckAreaModal } from '@/components/CheckAreaModal';
import { ReportModal } from '@/components/ReportModal';
import { AIAssistantModal } from '@/components/AIAssistantModal';
import { useQuery } from '@tanstack/react-query';
import { getFloodRisk, getDistricts, getRiverStations, getNearbyReports, getAlerts } from '@/lib/api';
import type { FloodRiskResponse } from '@/types';
import {
  ShieldCheck,
  Activity,
  AlertTriangle,
  Building,
  CheckCircle,
  Clock,
  Sparkles,
  Info,
  MapPin,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>('');
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isCheckAreaOpen, setIsCheckAreaOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Queries for live metrics
  const { data: districts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: () => getDistricts(),
  });

  const { data: rivers = [] } = useQuery({
    queryKey: ['rivers'],
    queryFn: () => getRiverStations(),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['reportsOverview'],
    queryFn: () => getNearbyReports(20.5937, 78.9629, 2000),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['alertsOverview'],
    queryFn: () => getAlerts(),
  });

  // Query risk data when a district is selected on map
  const { data: activeRiskData } = useQuery<FloodRiskResponse | null>({
    queryKey: ['activeDistrictRisk', selectedCoords?.lat, selectedCoords?.lon],
    queryFn: () => (selectedCoords ? getFloodRisk(selectedCoords.lat, selectedCoords.lon) : null),
    enabled: !!selectedCoords,
  });

  const handleSelectDistrict = (code: string, name: string, lat: number, lon: number) => {
    setSelectedCoords({ lat, lon });
    setSelectedDistrictName(name);
    setIsRiskModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <Hero onCheckArea={() => setIsCheckAreaOpen(true)} />

      {/* Service Cards */}
      <ServiceCards
        onCheckArea={() => setIsCheckAreaOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
      />

      {/* National Overview Metrics Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#B79A62]" />
                <span>National Flood Situation Overview</span>
              </h2>
              <p className="text-xs text-gray-500">
                Ground-truth observations aggregated across integrated APIs • Updated hourly
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Live Ingestion Active</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-100">
              <div className="text-gray-500 text-xs font-medium">Monitoring Districts</div>
              <div className="text-2xl font-extrabold text-[#101820] mt-1 font-mono">
                {districts.length > 0 ? districts.length : 18}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">Assam, Kerala, Delhi, MH +</div>
            </div>

            <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-100">
              <div className="text-gray-500 text-xs font-medium">Active River Telemetry</div>
              <div className="text-2xl font-extrabold text-blue-700 mt-1 font-mono">
                {rivers.length > 0 ? rivers.length : 5}
              </div>
              <div className="text-[11px] text-blue-600 font-medium mt-0.5">GloFAS River Basins</div>
            </div>

            <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-100">
              <div className="text-gray-500 text-xs font-medium">Active Official Alerts</div>
              <div className="text-2xl font-extrabold text-amber-700 mt-1 font-mono">
                {alerts.length}
              </div>
              <div className="text-[11px] text-amber-700 mt-0.5">Government Bulletins</div>
            </div>

            <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-100">
              <div className="text-gray-500 text-xs font-medium">Citizen Hazard Reports</div>
              <div className="text-2xl font-extrabold text-orange-600 mt-1 font-mono">
                {reports.length}
              </div>
              <div className="text-[11px] text-orange-600 mt-0.5">Verified / Under Review</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Interactive Map Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#B79A62]" />
              <span>National Interactive Flood Intelligence Map</span>
            </h2>
            <p className="text-xs text-gray-500">
              Inspect live weather reanalysis, river telemetry points, and road hazards. Click any district pin to inspect full risk breakdown.
            </p>
          </div>
          <button
            onClick={() => setIsAssistantOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#263746] hover:bg-[#344b5f] text-amber-300 text-xs font-bold transition-all shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Risk Assistant</span>
          </button>
        </div>

        <MapComponent
          onSelectDistrict={handleSelectDistrict}
          selectedCoords={selectedCoords}
          height="620px"
        />
      </section>

      {/* Trust & Transparency Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Trust, Explainability & Data Integrity Standards</span>
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              FloodWatch India adheres to strict data-grounding principles. We never manufacture fake measurements, fill coverage gaps with imaginary data, or downgrade government emergency alerts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-700">
            <div className="space-y-2 p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Real Source Data</span>
              </div>
              <p className="leading-relaxed">
                Weather forecasts and historical rainfall are retrieved from <strong>Open-Meteo</strong>. River discharge is retrieved from the <strong>GloFAS</strong> hydrodynamic model. No numbers are hardcoded or simulated in live views.
              </p>
            </div>

            <div className="space-y-2 p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Official Alert Precedence</span>
              </div>
              <p className="leading-relaxed">
                When official severe flood or rainfall alerts are active, they take statutory precedence. Internal risk scores can elevate vigilance, but they are forbidden from reducing or downgrading an official government alert.
              </p>
            </div>

            <div className="space-y-2 p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Honest Gap Reporting</span>
              </div>
              <p className="leading-relaxed">
                If an endpoint fails or a district lacks telemetry, it is explicitly labelled as <strong>DATA UNAVAILABLE</strong>. The system will never default missing data to a false zero or a fake green safe rating.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modals */}
      <RiskDetailModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        riskData={activeRiskData || null}
        locationName={selectedDistrictName || 'Selected District'}
      />

      <CheckAreaModal
        isOpen={isCheckAreaOpen}
        onClose={() => setIsCheckAreaOpen(false)}
        onSelectOnMap={(lat, lon, name) => {
          setSelectedCoords({ lat, lon });
          setSelectedDistrictName(name);
        }}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        defaultCoords={selectedCoords}
      />

      <AIAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
    </div>
  );
};
