import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapComponent } from '@/components/MapComponent';
import { RiskBadge } from '@/components/RiskBadge';
import { RainfallChart } from '@/components/RainfallChart';
import { getStates, getDistricts, getFloodRisk, getRainfall } from '@/lib/api';
import type { FloodRiskResponse, RainfallResponse } from '@/types';
import {
  MapPin,
  Layers,
  Search,
  Filter,
  Loader2,
  Info,
  ShieldAlert,
  CloudRain,
  ChevronRight,
} from 'lucide-react';

export const MapPage: React.FC = () => {
  const [selectedState, setSelectedState] = useState<string>('');
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

  const handleSelectDistrictOnMap = (code: string, name: string, lat: number, lon: number) => {
    setSelectedCoords({ lat, lon, name });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-[#B79A62]" />
            <span>Live Interactive Flood & Risk Intelligence Map</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            National geospatial overview. Click any district or river gauge to inspect real-time observations and risk breakdown.
          </p>
        </div>

        {/* State Quick-Filter */}
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Map Centerpiece */}
        <div className="lg:col-span-2 space-y-4">
          <MapComponent
            onSelectDistrict={handleSelectDistrictOnMap}
            selectedCoords={selectedCoords}
            height="650px"
          />
        </div>

        {/* Right Column: Zone Inspection Panel */}
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

            {/* 24h Rainfall Chart for this location */}
            {isLoadingRain ? (
              <div className="py-6 text-center text-xs text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin mx-auto text-blue-600 mb-1" />
                Loading rainfall points...
              </div>
            ) : rainfallData && rainfallData.hourly ? (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5 text-blue-600" />
                  <span>Precipitation History & Outlook</span>
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
      </div>
    </div>
  );
};
