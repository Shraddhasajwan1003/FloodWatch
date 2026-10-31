import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRiverStations, getRiverDischarge } from '@/lib/api';
import { RiverDischargeChart } from '@/components/RiverDischargeChart';
import type { RiverStation, RiverDischargeResponse } from '@/types';
import {
  Activity,
  AlertTriangle,
  Info,
  Droplets,
  Layers,
  ChevronRight,
  Loader2,
} from 'lucide-react';

export const RiversPage: React.FC = () => {
  const [selectedStationCode, setSelectedStationCode] = useState<string>('BRAHMAPUTRA-GUWAHATI');

  const { data: stations = [], isLoading: isLoadingStations } = useQuery({
    queryKey: ['riverStations'],
    queryFn: () => getRiverStations(),
  });

  const { data: dischargeData, isLoading: isLoadingDischarge } = useQuery({
    queryKey: ['riverDischarge', selectedStationCode],
    queryFn: () => getRiverDischarge(selectedStationCode),
    enabled: !!selectedStationCode,
  });

  const currentStation = stations.find((s) => s.station_code === selectedStationCode) || stations[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-blue-600">
          Hydrological Monitoring
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1 flex items-center gap-2">
          <Activity className="w-7 h-7 text-blue-600" />
          <span>River Telemetry & Basin Discharge Dashboard</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 max-w-3xl mt-1">
          Real-time hydrological monitoring for major Indian river systems including the Brahmaputra, Yamuna, Ganga, Mahanadi, and Periyar river basins.
        </p>
      </div>

      {/* Mandatory Scientific Transparency Banner */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Model Provenance & Central Water Commission Notice:</strong> The river discharge telemetry below is derived from the Global Flood Awareness System (GloFAS) via Open-Meteo under CC BY 4.0. Because the Central Water Commission (CWC) does not currently provide an open, unrestricted public REST API, these figures represent hydrodynamic model outputs rather than direct on-ground staff gauge measurements.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Station Selector Cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Supported Gauging Points
          </h2>

          {isLoadingStations ? (
            <div className="p-8 text-center text-xs text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
              Loading river stations...
            </div>
          ) : (
            stations.map((st) => {
              const isSelected = st.station_code === selectedStationCode;
              return (
                <button
                  key={st.station_code}
                  onClick={() => setSelectedStationCode(st.station_code)}
                  className={`w-full text-left p-4 rounded-xl border transition-all shadow-xs flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-gray-900">{st.name}</div>
                    <div className="text-xs text-gray-500">
                      River: <strong className="text-gray-700">{st.river_name}</strong>
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono">
                      {st.lat.toFixed(3)}°N, {st.lon.toFixed(3)}°E
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Right Column: Discharge Trend Chart & Metrics */}
        <div className="lg:col-span-2 space-y-6">
          {isLoadingDischarge ? (
            <div className="p-16 text-center text-xs text-gray-500 bg-white rounded-xl border border-gray-200">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              Loading GloFAS hydrodynamic discharge simulation...
            </div>
          ) : dischargeData && currentStation ? (
            <div className="space-y-6">
              {/* Telemetry Chart */}
              <RiverDischargeChart
                station={currentStation}
                daily={dischargeData.daily}
                attribution={dischargeData.attribution}
              />

              {/* Station Specific Details */}
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Station Hydrograph Metadata
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="text-gray-500 font-medium">Measurement</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">
                      Discharge (m³/s)
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="text-gray-500 font-medium">Latest Discharge</div>
                    <div className="text-sm font-bold text-blue-700 font-mono mt-0.5">
                      {dischargeData.latest_discharge_m3s
                        ? `${dischargeData.latest_discharge_m3s.toLocaleString()} m³/s`
                        : 'Simulating'}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="text-gray-500 font-medium">Warning Threshold</div>
                    <div className="text-sm font-bold text-yellow-800 mt-0.5">
                      {currentStation.warning_level_m ? `${currentStation.warning_level_m} m` : 'No Gauge Mark'}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="text-gray-500 font-medium">Danger Threshold</div>
                    <div className="text-sm font-bold text-red-700 mt-0.5">
                      {currentStation.danger_level_m ? `${currentStation.danger_level_m} m` : 'No Gauge Mark'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
