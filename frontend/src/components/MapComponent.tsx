import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import {
  getStates,
  getDistricts,
  getRiverStations,
  getNearbyReports,
  getNearbyFacilities,
  getAlerts,
} from '@/lib/api';
import { RISK_DISPLAY, formatRelativeTime } from '@/lib/risk';
import { RiskBadge } from '@/components/RiskBadge';
import { DosAndDontsModal } from '@/components/DosAndDontsModal';
import type { RiskLevel, RiverStation, CommunityReport, Facility, OfficialAlert } from '@/types';
import {
  Layers,
  MapPin,
  Activity,
  AlertTriangle,
  Hospital,
  Info,
  Maximize2,
  Navigation,
  ShieldAlert,
  Zap,
  Wind,
  Flame,
  Search,
} from 'lucide-react';

// Custom icons using Lucide SVGs encoded as Leaflet DivIcons
const createDivIcon = (color: string, label: string) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
        ${label}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

interface MapComponentProps {
  onSelectDistrict?: (districtCode: string, name: string, lat: number, lon: number) => void;
  selectedCoords?: { lat: number; lon: number } | null;
  height?: string;
  selectedHazard?: string;
}

// Controller to fly to coordinates when updated externally
const MapController: React.FC<{ coords?: { lat: number; lon: number } | null }> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo([coords.lat, coords.lon], 9, { duration: 1.5 });
    }
  }, [coords, map]);
  return null;
};

// Map click handler to inspect custom points
const MapClickHandler: React.FC<{ onMapClick: (lat: number, lon: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const MapComponent: React.FC<MapComponentProps> = ({
  onSelectDistrict,
  selectedCoords,
  height = '620px',
  selectedHazard = 'all',
}) => {
  // Layer toggles
  const [layers, setLayers] = useState({
    risk: true,
    rivers: true,
    reports: true,
    facilities: true,
    alerts: true,
  });

  const [selectedStateCode, setSelectedStateCode] = useState<string>('');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [activeDndHazard, setActiveDndHazard] = useState<string | null>(null);

  // Queries for real backend data
  const { data: states = [] } = useQuery({
    queryKey: ['statesList'],
    queryFn: () => getStates(),
  });

  const { data: districts = [] } = useQuery({
    queryKey: ['districts', selectedStateCode],
    queryFn: () => getDistricts(selectedStateCode || undefined),
  });

  const { data: rivers = [] } = useQuery({
    queryKey: ['rivers', selectedStateCode],
    queryFn: () => getRiverStations(selectedStateCode || undefined),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['nearbyReports'],
    queryFn: () => getNearbyReports(20.5937, 78.9629, 2000), // National radius
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => getNearbyFacilities(20.5937, 78.9629, 2000),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['allAlertsMap', selectedHazard],
    queryFn: () => getAlerts(undefined, selectedHazard),
  });

  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleStateChange = (stCode: string) => {
    setSelectedStateCode(stCode);
    setSelectedDistrictCode('');
    const st = states.find((s) => s.code === stCode);
    if (st && st.centroid_lat && st.centroid_lon && onSelectDistrict) {
      onSelectDistrict(st.code, st.name, st.centroid_lat, st.centroid_lon);
    }
  };

  const handleDistrictChange = (dCode: string) => {
    setSelectedDistrictCode(dCode);
    const d = districts.find((it) => it.code === dCode);
    if (d && onSelectDistrict) {
      onSelectDistrict(d.code, d.name, d.centroid_lat, d.centroid_lon);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));

        // Find nearest district
        let closest = districts[0];
        let minDist = Infinity;
        districts.forEach((d) => {
          const dist = Math.hypot(d.centroid_lat - lat, d.centroid_lon - lon);
          if (dist < minDist) {
            minDist = dist;
            closest = d;
          }
        });

        if (closest && onSelectDistrict) {
          onSelectDistrict(closest.code, `${closest.name} (My Location)`, lat, lon);
        }
        setIsLocating(false);
      },
      (err) => {
        alert('Could not access GPS. Please check browser permissions.');
        setIsLocating(false);
      }
    );
  };

  const handleMapClick = (lat: number, lon: number) => {
    if (onSelectDistrict) {
      onSelectDistrict('CUSTOM', `Queried Location (${lat.toFixed(3)}, ${lon.toFixed(3)})`, lat, lon);
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-300 shadow-md bg-white">
      {/* Top Location Selection Bar (State -> District & GPS) */}
      <div className="p-3 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* State selector */}
          <select
            value={selectedStateCode}
            onChange={(e) => handleStateChange(e.target.value)}
            className="p-1.5 rounded-lg border border-gray-300 bg-white font-semibold text-gray-800"
          >
            <option value="">All States / UTs ({states.length})</option>
            {states.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>

          {/* District selector */}
          <select
            value={selectedDistrictCode}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="p-1.5 rounded-lg border border-gray-300 bg-white font-semibold text-gray-800 max-w-xs"
          >
            <option value="">Select District ({districts.length} covered)</option>
            {districts.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>

          {/* GPS Button */}
          <button
            onClick={handleUseMyLocation}
            disabled={isLocating}
            className="px-3 py-1.5 rounded-lg bg-[#101820] hover:bg-gray-800 text-white font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Navigation className={`w-3.5 h-3.5 text-[#B79A62] ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
          </button>
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => toggleLayer('risk')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
              layers.risk ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-gray-100 text-gray-500'
            }`}
          >
            Districts
          </button>
          <button
            onClick={() => toggleLayer('alerts')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
              layers.alerts ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-gray-100 text-gray-500'
            }`}
          >
            Alerts ({alerts.length})
          </button>
          <button
            onClick={() => toggleLayer('rivers')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
              layers.rivers ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-gray-100 text-gray-500'
            }`}
          >
            River Gauges
          </button>
          <button
            onClick={() => toggleLayer('reports')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
              layers.reports ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-100 text-gray-500'
            }`}
          >
            Hazards
          </button>
          <button
            onClick={() => toggleLayer('facilities')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
              layers.facilities ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-gray-100 text-gray-500'
            }`}
          >
            Shelters
          </button>
        </div>
      </div>

      {/* Main Leaflet Map */}
      <MapContainer
        center={[22.5937, 78.9629]} // India geographic center
        zoom={5}
        minZoom={4}
        maxZoom={14}
        style={{ height, width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapController coords={selectedCoords} />
        <MapClickHandler onMapClick={handleMapClick} />

        {/* Standard OpenStreetMap TileLayer with visible attribution */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Monitored Districts Markers */}
        {layers.risk &&
          districts.map((d) => (
            <Marker
              key={`dist-${d.code}`}
              position={[d.centroid_lat, d.centroid_lon]}
              icon={createDivIcon('#16A34A', 'D')}
              eventHandlers={{
                click: () => {
                  if (onSelectDistrict) {
                    onSelectDistrict(d.code, d.name, d.centroid_lat, d.centroid_lon);
                  }
                },
              }}
            >
              <Popup>
                <div className="p-1 space-y-2 text-xs">
                  <div className="font-bold text-sm text-gray-900">{d.name}</div>
                  <div className="text-[11px] text-gray-500 font-mono">
                    {d.centroid_lat.toFixed(3)}°N, {d.centroid_lon.toFixed(3)}°E
                  </div>
                  <button
                    onClick={() => {
                      if (onSelectDistrict) {
                        onSelectDistrict(d.code, d.name, d.centroid_lat, d.centroid_lon);
                      }
                    }}
                    className="w-full py-1 rounded bg-[#101820] text-white text-[11px] font-bold"
                  >
                    View Local Risk & Forecast
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Multi-Hazard Official Alerts Layer */}
        {layers.alerts &&
          alerts.map((alt) => {
            // Assign coordinate based on district/state or defaults
            const isCyclone = alt.hazard_type === 'cyclone';
            const isThunder = alt.hazard_type === 'thunderstorm';
            const color = alt.severity === 'extreme' ? '#DC2626' : alt.severity === 'severe' ? '#EA580C' : '#CA8A04';
            const symbol = isCyclone ? '🌀' : isThunder ? '⚡' : '⚠️';

            // Use a representative location until alert coordinates are exposed by the API.
            const pos: [number, number] = [
              isCyclone ? 20.2644 : isThunder ? 26.1445 : 28.6139,
              isCyclone ? 86.6710 : isThunder ? 91.7362 : 77.2090,
            ];

            return (
              <Marker
                key={`alert-${alt.id || alt.alert_id}`}
                position={pos}
                icon={createDivIcon(color, symbol)}
              >
                <Popup>
                  <div className="p-1 space-y-2 text-xs max-w-[240px]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                        {alt.hazard_type || 'Disaster Alert'}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-gray-500">{alt.severity}</span>
                    </div>
                    <div className="font-bold text-gray-900 leading-snug">{alt.headline}</div>
                    <p className="text-[11px] text-gray-600 line-clamp-3">{alt.description}</p>
                    <button
                      onClick={() => setActiveDndHazard(alt.hazard_type || 'flood')}
                      className="w-full py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold uppercase tracking-wider"
                    >
                      View NDMA Dos and Don'ts
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* River Stations Layer */}
        {layers.rivers &&
          rivers.map((r) => (
            <Marker
              key={`river-${r.station_code}`}
              position={[r.lat, r.lon]}
              icon={createDivIcon('#0284C7', 'R')}
            >
              <Popup>
                <div className="p-1 space-y-1 text-xs">
                  <div className="font-bold text-sm text-gray-900">{r.name}</div>
                  <div className="text-gray-600">River: {r.river_name}</div>
                  {r.warning_level_m && (
                    <div className="text-amber-700 font-semibold text-[11px]">Warning: {r.warning_level_m} m</div>
                  )}
                  {r.danger_level_m && (
                    <div className="text-red-700 font-semibold text-[11px]">Danger: {r.danger_level_m} m</div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Community Hazards Layer */}
        {layers.reports &&
          reports.map((rep) => (
            <Marker
              key={`rep-${rep.id}`}
              position={[rep.lat, rep.lon]}
              icon={createDivIcon('#F59E0B', '!')}
            >
              <Popup>
                <div className="p-1 space-y-1 text-xs">
                  <div className="font-bold text-amber-900 uppercase">{rep.category.replace('_', ' ')}</div>
                  <p className="text-gray-700">{rep.description}</p>
                  {rep.water_depth_cm && (
                    <div className="text-red-700 font-semibold text-[11px]">Water Depth: ~{rep.water_depth_cm} cm</div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Hospitals & Shelters */}
        {layers.facilities &&
          facilities.map((f) => (
            <Marker
              key={`fac-${f.id}`}
              position={[f.lat, f.lon]}
              icon={createDivIcon('#7C3AED', f.facility_type === 'hospital' ? 'H' : 'S')}
            >
              <Popup>
                <div className="p-1 space-y-1 text-xs">
                  <div className="font-bold text-gray-900">{f.name}</div>
                  <div className="text-gray-600 text-[11px]">{f.address}</div>
                  {f.phone && <div className="text-blue-700 font-bold font-mono text-[11px]">📞 {f.phone}</div>}
                  <div className="text-[10px] text-gray-500 uppercase">{f.facility_type}</div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Selected custom coordinates pin */}
        {selectedCoords && (
          <CircleMarker
            center={[selectedCoords.lat, selectedCoords.lon]}
            radius={12}
            pathOptions={{ color: '#B79A62', fillColor: '#B79A62', fillOpacity: 0.4, weight: 3 }}
          />
        )}
      </MapContainer>

      {/* Bottom Map Legend */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-gray-600 gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-gray-800">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600" />
            <span>District (D)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600" />
            <span>Disaster Alert (!)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600" />
            <span>River Gauge (R)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-600" />
            <span>Shelter / Hospital (S/H)</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-gray-500">
          <Info className="w-3.5 h-3.5" />
          <span>Click anywhere to inspect coordinates or query local risks</span>
        </div>
      </div>

      {/* Dos and Don'ts Modal */}
      {activeDndHazard && (
        <DosAndDontsModal
          isOpen={!!activeDndHazard}
          onClose={() => setActiveDndHazard(null)}
          defaultHazard={activeDndHazard}
        />
      )}
    </div>
  );
};
