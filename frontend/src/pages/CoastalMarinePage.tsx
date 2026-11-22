import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getMarineConditions,
  getCoastalZones,
  getRiverbankZones,
} from '@/lib/api';
import type { CoastalFishingZone, RiverbankHighFlowZone } from '@/types';
import {
  Anchor,
  Waves,
  AlertTriangle,
  ShieldAlert,
  Wind,
  PhoneCall,
  Activity,
  Compass,
  Navigation,
  Info,
  ChevronRight,
  Loader2,
  Ship,
  LifeBuoy,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const CoastalMarinePage: React.FC = () => {
  const [selectedZone, setSelectedZone] = useState<CoastalFishingZone>({
    zone_id: 'PARADIP-OD',
    name: 'Paradip Deep Sea Fishery Harbor',
    coast: 'Bay of Bengal',
    state_code: 'OD',
    district: 'Jagatsinghpur',
    lat: 20.2644,
    lon: 86.6710,
    port_warning_signal: 'Signal 3 (Local Cautionary)',
    typical_crafts: ['Mechanized Trawlers', 'Motorized Fiber Boats', 'Traditional Catamarans'],
  });

  const { data: coastalZones = [], isLoading: isLoadingZones } = useQuery({
    queryKey: ['coastalZones'],
    queryFn: getCoastalZones,
  });

  const { data: riverbankZones = [] } = useQuery({
    queryKey: ['riverbankZones'],
    queryFn: getRiverbankZones,
  });

  const { data: marineData, isLoading: isLoadingMarine } = useQuery({
    queryKey: ['marineConditions', selectedZone.lat, selectedZone.lon],
    queryFn: () => getMarineConditions(selectedZone.lat, selectedZone.lon),
    refetchInterval: 60000,
  });

  const handleUseLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        // Find nearest coastal zone
        if (coastalZones.length > 0) {
          let closest = coastalZones[0];
          let minDist = Infinity;
          for (const z of coastalZones) {
            const d = Math.hypot(z.lat - lat, z.lon - lon);
            if (d < minDist) {
              minDist = d;
              closest = z;
            }
          }
          setSelectedZone(closest);
        }
      });
    }
  };

  const chartData = marineData?.hourly?.map((h) => {
    const dt = new Date(h.time);
    return {
      time: dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      waveHeight: h.wave_height_m ?? 0,
      swellHeight: h.swell_wave_height_m ?? 0,
    };
  }) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-600 flex items-center gap-1.5">
            <Anchor className="w-3.5 h-3.5" />
            <span>Maritime Safety & High-Flow River Settlement Watch</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1 flex items-center gap-2">
            <Ship className="w-7 h-7 text-cyan-700" />
            <span>Fishermen Sea Advisory & Riverbank Inundation Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 max-w-3xl mt-1">
            Real-time open ocean swell and wave height forecasts for seafarers, port warning hoist signals, and flash-flood buffer advisories for communities living alongside heavy-flow riverbanks.
          </p>
        </div>

        <button
          onClick={handleUseLocation}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#101820] hover:bg-gray-800 text-white text-xs font-bold transition-all shadow-sm shrink-0"
        >
          <Navigation className="w-3.5 h-3.5 text-[#B79A62]" />
          <span>Find Nearest Coastal Port</span>
        </button>
      </div>

      {/* Official INCOIS / Coast Guard Directive Banner */}
      <div className="p-4 rounded-xl bg-cyan-900 text-white text-xs space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-cyan-300">
            <ShieldAlert className="w-4 h-4 text-cyan-300" />
            <span>Statutory Maritime Safety Directive (INCOIS / IMD)</span>
          </div>
          <span className="text-[10px] bg-cyan-800 px-2 py-0.5 rounded font-mono text-cyan-200">
            24x7 Marine Surveillance
          </span>
        </div>
        <p className="text-cyan-100 text-[11px] leading-relaxed">
          Small motorized craft and traditional catamarans must monitor Port Warning Signals before sailing. When sea wave height exceeds 2.5 meters or wind gusts exceed 45 km/h, all deep-sea fishing is prohibited under Indian Maritime Directives.
        </p>
      </div>

      {/* Main Grid: Coastal Harbor Selector & Live Marine Wave Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Fishing Harbors List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Anchor className="w-4 h-4 text-cyan-700" />
              <span>Monitored Coastal Harbors ({coastalZones.length})</span>
            </h2>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {isLoadingZones ? (
              <div className="p-8 text-center text-xs text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-cyan-600 mb-2" />
                Loading coastal harbors...
              </div>
            ) : (
              coastalZones.map((z) => {
                const isSelected = z.zone_id === selectedZone.zone_id;
                return (
                  <button
                    key={z.zone_id}
                    onClick={() => setSelectedZone(z)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs space-y-1.5 ${
                      isSelected
                        ? 'bg-cyan-50/70 border-cyan-500 ring-2 ring-cyan-500/40 shadow-xs'
                        : 'bg-white border-gray-200 hover:border-gray-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-bold text-gray-900 leading-snug">{z.name}</div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold shrink-0 ml-2">
                        {z.state_code}
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-500 flex items-center justify-between">
                      <span>{z.coast}</span>
                      <span className="font-mono text-cyan-700 font-semibold">{z.lat.toFixed(2)}°N, {z.lon.toFixed(2)}°E</span>
                    </div>

                    <div className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 inline-block">
                      {z.port_warning_signal}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Live Sea Swell & Wave Telemetry (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {isLoadingMarine ? (
            <div className="p-16 text-center text-xs text-gray-500 bg-white rounded-xl border border-gray-200">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-700 mb-2" />
              Fetching live Open-Meteo ocean swell telemetry...
            </div>
          ) : marineData ? (
            <div className="space-y-5">
              {/* Active Harbor Banner & Fisherman Sea Status */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">
                      Live Harbor Ocean Station
                    </span>
                    <h3 className="text-xl font-extrabold text-gray-900 mt-0.5">{selectedZone.name}</h3>
                    <p className="text-xs text-gray-500">
                      {selectedZone.district}, {selectedZone.coast} • GPS: {selectedZone.lat.toFixed(3)}°N, {selectedZone.lon.toFixed(3)}°E
                    </p>
                  </div>

                  {/* Fisherman Advisory Badge */}
                  <div className={`px-4 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs ${
                    marineData.advisory_level === 'red'
                      ? 'bg-red-600 text-white border-red-700 animate-pulse'
                      : marineData.advisory_level === 'orange'
                      ? 'bg-amber-500 text-white border-amber-600'
                      : marineData.advisory_level === 'yellow'
                      ? 'bg-yellow-100 text-yellow-900 border-yellow-300'
                      : 'bg-emerald-600 text-white border-emerald-700'
                  }`}>
                    <LifeBuoy className="w-4 h-4" />
                    <span>{marineData.advisory_status}</span>
                  </div>
                </div>

                {/* Key Marine Wave Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <span className="text-gray-500 text-[11px]">Current Wave Height</span>
                    <div className="text-2xl font-extrabold font-mono text-cyan-800">
                      {marineData.current_wave_height_m} <span className="text-xs font-normal text-gray-500">m</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Significant Sea Wave</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <span className="text-gray-500 text-[11px]">Peak 3-Day Swell</span>
                    <div className="text-2xl font-extrabold font-mono text-blue-800">
                      {marineData.max_wave_height_3d_m} <span className="text-xs font-normal text-gray-500">m</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Maximum Breaker Peak</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <span className="text-gray-500 text-[11px]">Current Swell Height</span>
                    <div className="text-2xl font-extrabold font-mono text-indigo-800">
                      {marineData.current_swell_height_m} <span className="text-xs font-normal text-gray-500">m</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Open Ocean Swell</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <span className="text-gray-500 text-[11px]">Port Signal Hoist</span>
                    <div className="text-sm font-bold text-amber-800 font-mono mt-1 leading-snug">
                      {marineData.port_signal}
                    </div>
                    <span className="text-[10px] text-gray-500">Harbor Maritime Signal</span>
                  </div>
                </div>

                <div className="p-3 bg-cyan-50/70 rounded-xl border border-cyan-100 text-xs text-cyan-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Fisherman Action Directives:</strong> {marineData.advisory_reason}
                  </div>
                </div>
              </div>

              {/* 24-Hour Wave & Swell Height Distribution Chart */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Waves className="w-4 h-4 text-cyan-600" />
                      <span>24-Hour Wave & Swell Height Progression</span>
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Blue bars indicate wave height (m); values above 2.5m trigger small craft warnings.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">Open-Meteo Marine</span>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} unit="m" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const p = payload[0].payload;
                            return (
                              <div className="bg-[#101820] text-white p-2.5 rounded-md shadow-lg text-xs space-y-1">
                                <div className="font-semibold">{p.time}</div>
                                <div className="text-cyan-300 font-bold">Wave Height: {p.waveHeight} m</div>
                                <div className="text-blue-300">Swell Height: {p.swellHeight} m</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="waveHeight" fill="#0891B2" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Indian Maritime Emergency Contacts */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-red-600" />
                  <span>Indian Coast Guard & Coastal Maritime Distress Helplines</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-red-200 bg-red-50/70 space-y-1">
                    <span className="text-[11px] text-gray-600 font-medium">Coast Guard Search & Rescue</span>
                    <div className="flex items-center justify-between">
                      <strong className="text-base font-extrabold text-red-700 font-mono">1554</strong>
                      <a href="tel:1554" className="px-2 py-1 rounded bg-red-600 text-white font-bold text-[10px]">
                        Call 1554
                      </a>
                    </div>
                    <span className="text-[10px] text-gray-500">Toll-free maritime rescue</span>
                  </div>

                  <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/70 space-y-1">
                    <span className="text-[11px] text-gray-600 font-medium">Coastal Security Toll-Free</span>
                    <div className="flex items-center justify-between">
                      <strong className="text-base font-extrabold text-blue-700 font-mono">1093</strong>
                      <a href="tel:1093" className="px-2 py-1 rounded bg-blue-600 text-white font-bold text-[10px]">
                        Call 1093
                      </a>
                    </div>
                    <span className="text-[10px] text-gray-500">Marine Police Control</span>
                  </div>

                  <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 space-y-1">
                    <span className="text-[11px] text-gray-600 font-medium">VHF Marine Radio</span>
                    <div className="text-base font-extrabold text-gray-900 font-mono">Channel 16</div>
                    <span className="text-[10px] text-gray-500">156.8 MHz Distress Calling</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Heavy Flow Riverbank Settlement Vulnerability Watch */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
            Inland River Settlements
          </div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-0.5">
            <Activity className="w-5 h-5 text-amber-600" />
            <span>Heavy Flow Riverbank Inundation & Erosion Watch</span>
          </h2>
          <p className="text-xs text-gray-600 mt-1 max-w-3xl">
            Advisories for communities residing within 500 meters of India's major high-velocity river channels (Brahmaputra, Ganga, Yamuna, Kosi, Periyar, and Narmada).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {riverbankZones.map((rz) => (
            <div
              key={rz.zone_id}
              className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white transition-all space-y-2.5 text-xs flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-gray-900 text-sm">{rz.name}</span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-100 text-blue-800">
                    River {rz.river}
                  </span>
                </div>

                <div className="text-gray-500 text-[11px]">
                  District: <strong className="text-gray-700">{rz.district}</strong> ({rz.state_code})
                </div>

                <div className="text-red-700 font-semibold text-[11px]">
                  ⚠️ Hazard: {rz.vulnerability_type}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-600">Safe Evacuation Buffer:</span>
                  <strong className="font-mono text-red-600 font-bold">{rz.buffer_evacuation_distance_m} meters inland</strong>
                </div>

                <p className="text-[11px] text-gray-600 leading-relaxed bg-white p-2 rounded-lg border border-gray-100">
                  {rz.emergency_advice}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Port Warning Hoist Signals Guide */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4 text-[#B79A62]" />
          <span>Indian Maritime Port Cautionary Hoist Signals Reference</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
            <span className="font-bold text-gray-900">Signal 1 & 2 (Cautionary)</span>
            <p className="text-gray-600 text-[11px]">
              Distant low pressure or depression. Port not threatened; squally weather may develop offshore.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
            <span className="font-bold text-amber-900">Signal 3 & 4 (Local Warning)</span>
            <p className="text-gray-700 text-[11px]">
              Port threatened by squalls or cyclone approach. Small crafts and country boats warned not to venture out.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 space-y-1">
            <span className="font-bold text-orange-900">Signal 5, 6 & 7 (Danger)</span>
            <p className="text-gray-700 text-[11px]">
              Severe cyclonic storm expected to cross coast near port. Ships must secure moorings; sea venture suspended.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-1">
            <span className="font-bold text-red-900">Signal 8, 9 & 10 (Great Danger)</span>
            <p className="text-gray-700 text-[11px]">
              Super cyclone crossing port. Catastrophic storm surge and waves exceeding 4 meters expected. Complete evacuation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
