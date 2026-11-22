import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapComponent } from '@/components/MapComponent';
import { RiskBadge } from '@/components/RiskBadge';
import { RainfallChart } from '@/components/RainfallChart';
import { getStates, getDistricts, getFloodRisk, getRainfall, getForecasts, getAlerts } from '@/lib/api';
import type { FloodRiskResponse, RainfallResponse } from '@/types';
import {
  MapPin,
  Layers,
  Navigation,
  BarChart2,
  Filter,
  Loader2,
  CloudRain,
  ChevronRight,
  Calendar,
  Info,
  AlertTriangle,
} from 'lucide-react';

type TabId = 'map' | 'forecast' | 'split';
type HazardFilter = 'ALL' | 'Flood' | 'Thunderstorm' | 'Cyclone' | 'Fire' | 'Earthquake';

const HAZARD_CHIPS: { label: string; id: HazardFilter; emoji: string }[] = [
  { label: 'ALL', id: 'ALL', emoji: '' },
  { label: 'Flood', id: 'Flood', emoji: '🌊' },
  { label: 'Thunderstorm', id: 'Thunderstorm', emoji: '⚡' },
  { label: 'Cyclone', id: 'Cyclone', emoji: '🌀' },
  { label: 'Fire', id: 'Fire', emoji: '🔥' },
  { label: 'Earthquake', id: 'Earthquake', emoji: '🏚️' },
];

export const MapPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [hazardFilter, setHazardFilter] = useState<HazardFilter>('ALL');
  const [selectedState, setSelectedState] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lon: number;
    name: string;
  }>({
    lat: 26.1445,
    lon: 91.7362,
    name: 'Guwahati (Kamrup), Assam',
  });

  const { data: states = [] } = useQuery({
    queryKey: ['states'],
    queryFn: () => getStates(),
  });

  const { data: districts = [] } = useQuery({
    queryKey: ['districts', selectedState],
    queryFn: () => getDistricts(selectedState),
  });

  const { data: riskData, isLoading: isLoadingRisk } = useQuery<FloodRiskResponse | null>({
    queryKey: ['mapRisk', selectedCoords.lat, selectedCoords.lon],
    queryFn: () => getFloodRisk(selectedCoords.lat, selectedCoords.lon),
  });

  const { data: rainfallData, isLoading: isLoadingRain } = useQuery<RainfallResponse | null>({
    queryKey: ['mapRainfall', selectedCoords.lat, selectedCoords.lon],
    queryFn: () => getRainfall(selectedCoords.lat, selectedCoords.lon, 24),
  });

  const { data: forecastData, isLoading: isLoadingForecast } = useQuery({
    queryKey: ['mapForecast7Day', selectedCoords.lat, selectedCoords.lon],
    queryFn: () => getForecasts(selectedCoords.lat, selectedCoords.lon, 7),
    enabled: activeTab === 'forecast' || activeTab === 'split',
  });

  const { data: hourlyRainfall, isLoading: isLoadingHourly } = useQuery<RainfallResponse | null>({
    queryKey: ['mapHourlyRainfall', selectedCoords.lat, selectedCoords.lon],
    queryFn: () => getRainfall(selectedCoords.lat, selectedCoords.lon, 48),
    enabled: activeTab === 'forecast' || activeTab === 'split',
  });

  const handleSelectDistrictOnMap = (_code: string, name: string, lat: number, lon: number) => {
    setSelectedCoords({ lat, lon, name });
  };

  const handleUseMyGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));
        let closestName = `My GPS Position (${lat}°N, ${lon}°E)`;
        if (districts.length > 0) {
          let minDist = Infinity;
          for (const d of districts) {
            const dist = Math.hypot(d.centroid_lat - lat, d.centroid_lon - lon);
            if (dist < minDist && dist < 0.8) {
              minDist = dist;
              closestName = `${d.name} (Near My Location)`;
            }
          }
        }
        setSelectedCoords({ lat, lon, name: closestName });
        setIsLocating(false);
      },
      () => {
        alert('Could not access your location. Please check browser permissions.');
        setIsLocating(false);
      }
    );
  };

  /* ---- Sub-panels ---- */
  const InspectionPanel = () => (
    <div className="space-y-5">
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#B79A62]">
            Active Zone Inspection
          </div>
          <h2 className="text-base font-extrabold text-gray-900 mt-0.5">
            {selectedCoords.name}
          </h2>
          <div className="text-[11px] font-mono text-gray-400">
            {selectedCoords.lat.toFixed(4)}°N, {selectedCoords.lon.toFixed(4)}°E
          </div>
        </div>

        {/* Risk Rating Card */}
        {isLoadingRisk ? (
          <div className="py-6 text-center text-xs text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin mx-auto text-[#B79A62] mb-1" />
            Calculating risk score...
          </div>
        ) : riskData ? (
          <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Risk Classification:</span>
              <RiskBadge level={riskData.displayed_level} score={riskData.score} size="md" />
            </div>
            <p className="text-xs text-gray-700 leading-relaxed pt-1">
              {riskData.explanation}
            </p>
            {riskData.official_override && (
              <div className="text-[11px] text-red-700 font-bold bg-red-50 p-1.5 rounded border border-red-200">
                ⚠️ Elevated by active official government warning.
              </div>
            )}
          </div>
        ) : null}

        {/* 24h Rainfall Chart */}
        {isLoadingRain ? (
          <div className="py-6 text-center text-xs text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin mx-auto text-blue-600 mb-1" />
            Loading rainfall points...
          </div>
        ) : rainfallData && rainfallData.hourly ? (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-blue-600" />
              <span>Precipitation History &amp; Outlook</span>
            </h3>
            <RainfallChart
              data={rainfallData.hourly}
              total24h={rainfallData.total_24h_mm}
              forecast24h={rainfallData.forecast_24h_mm}
              attribution={rainfallData.attribution}
            />
          </div>
        ) : null}
      </div>

      {/* Quick Monitored Districts Picker */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
          Jump to Monitored Basin District
        </h3>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {districts.slice(0, 8).map((d) => (
            <button
              key={d.code}
              onClick={() =>
                setSelectedCoords({ lat: d.centroid_lat, lon: d.centroid_lon, name: d.name })
              }
              className="w-full text-left p-2 rounded-md hover:bg-gray-50 flex items-center justify-between text-xs text-gray-800 transition-colors border border-transparent hover:border-gray-200"
            >
              <span className="font-semibold">{d.name}</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const ForecastPanel = () => (
    <div className="space-y-6">
      {/* Scientific disclaimer */}
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Essential Meteorological Distinction:</strong> A rainfall forecast
          predicts expected atmospheric precipitation depth in mm. It does <em>not</em> calculate
          street-level inundation.
        </div>
      </div>

      {/* 48h Hourly Precipitation */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
          48-Hour Hourly Precipitation Distribution
        </h2>
        {isLoadingHourly ? (
          <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-xl border border-gray-200">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#B79A62] mb-2" />
            Loading hourly atmospheric forecast...
          </div>
        ) : hourlyRainfall && hourlyRainfall.hourly ? (
          <RainfallChart
            data={hourlyRainfall.hourly}
            total24h={hourlyRainfall.total_24h_mm}
            forecast24h={hourlyRainfall.forecast_24h_mm}
            locationName={selectedCoords.name}
            attribution={hourlyRainfall.attribution}
          />
        ) : null}
      </div>

      {/* 7-Day Outlook */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-700" />
          <span>7-Day Meteorological Outlook &amp; Hydrological Concern Matrix</span>
        </h2>
        {isLoadingForecast ? (
          <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-xl border border-gray-200">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-amber-600 mb-2" />
            Generating 7-day weather model aggregation...
          </div>
        ) : forecastData && forecastData.days ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {forecastData.days.map((day: any) => {
              const dt = new Date(day.date);
              const dayStr = dt.toLocaleDateString('en-IN', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
              });
              return (
                <div
                  key={day.date}
                  className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-900">{dayStr}</span>
                      <RiskBadge level={day.hydrological_risk} size="sm" />
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <div className="text-2xl font-extrabold text-blue-700 font-mono">
                        {day.total_precipitation_mm}{' '}
                        <span className="text-xs text-gray-500 font-normal">mm</span>
                      </div>
                      {day.max_probability_pct > 0 && (
                        <span className="text-xs text-amber-700 font-semibold">
                          ({day.max_probability_pct}% prob)
                        </span>
                      )}
                    </div>
                    {day.temp_max_c !== null && day.temp_min_c !== null && (
                      <div className="text-[11px] text-gray-500 mt-1">
                        Temp: {day.temp_min_c}°C – {day.temp_max_c}°C
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-600 leading-snug">
                    {day.hydrological_commentary}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'map', label: '🗺️ Interactive Map', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'forecast', label: '📊 24h & 7-Day Forecasts', icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { id: 'split', label: '⚡ Split View (Map + Forecast)', icon: <Info className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-[#B79A62]" />
            <span>Live Flood &amp; Risk Intelligence</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            National geospatial overview with 24h/7-day forecasts. Click any district to inspect.
          </p>
        </div>

        {/* Controls: State + GPS */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">State:</span>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="text-xs p-2 rounded-md border border-gray-300 bg-white font-medium text-gray-800"
          >
            <option value="">-- All India States --</option>
            {states.map((st) => (
              <option key={st.code} value={st.code}>
                {st.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleUseMyGPS}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#101820] hover:bg-gray-800 text-white text-xs font-bold transition-all shadow-sm"
          >
            <Navigation className={`w-3.5 h-3.5 text-[#B79A62] ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
          </button>
        </div>
      </div>

      {/* Hazard Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        <span className="text-xs font-semibold text-gray-600 shrink-0">Hazard:</span>
        {HAZARD_CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => setHazardFilter(chip.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
              hazardFilter === chip.id
                ? 'bg-[#101820] text-white border-[#101820]'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
            }`}
          >
            {chip.emoji && <span>{chip.emoji}</span>}
            <span>{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-[#B79A62] text-[#101820] bg-amber-50/60'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 space-y-4">
            <MapComponent
              onSelectDistrict={handleSelectDistrictOnMap}
              selectedCoords={selectedCoords}
              height="650px"
            />
          </div>
          {/* Right: Inspection Panel */}
          <div>
            <InspectionPanel />
          </div>
        </div>
      )}

      {activeTab === 'forecast' && (
        <div>
          {/* Location summary */}
          <div className="mb-4 flex items-center gap-2 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-xs">
            <MapPin className="w-3.5 h-3.5 text-[#B79A62]" />
            <span className="font-bold text-gray-900">{selectedCoords.name}</span>
            <span className="font-mono text-gray-400">
              {selectedCoords.lat.toFixed(4)}°N, {selectedCoords.lon.toFixed(4)}°E
            </span>
          </div>
          <ForecastPanel />
        </div>
      )}

      {activeTab === 'split' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left: Map */}
          <div>
            <MapComponent
              onSelectDistrict={handleSelectDistrictOnMap}
              selectedCoords={selectedCoords}
              height="600px"
            />
          </div>
          {/* Right: Forecast */}
          <div className="overflow-y-auto max-h-[700px] pr-1 space-y-5">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider pb-1 border-b border-gray-200">
              Forecast for: {selectedCoords.name}
            </div>
            <ForecastPanel />
          </div>
        </div>
      )}
    </div>
  );
};
