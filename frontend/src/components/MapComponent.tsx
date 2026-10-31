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
import { getStates, getDistricts, getRiverStations, getNearbyReports, getNearbyFacilities } from '@/lib/api';
import { RISK_DISPLAY, formatRelativeTime } from '@/lib/risk';
import { RiskBadge } from '@/components/RiskBadge';
import type { RiskLevel, RiverStation, CommunityReport, Facility } from '@/types';
import {
  Layers,
  MapPin,
  Activity,
  AlertTriangle,
  Hospital,
  Info,
  Maximize2,
} from 'lucide-react';

// Custom icons using Lucide SVGs encoded as Leaflet DivIcons
const createDivIcon = (color: string, label: string) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
        ${label}
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

interface MapComponentProps {
  onSelectDistrict?: (districtCode: string, name: string, lat: number, lon: number) => void;
  selectedCoords?: { lat: number; lon: number } | null;
  height?: string;
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
}) => {
  // Layer toggles
  const [layers, setLayers] = useState({
    risk: true,
    rivers: true,
    reports: true,
    facilities: true,
  });

  const [inspectLocation, setInspectLocation] = useState<{ lat: number; lon: number } | null>(null);

  // Queries for real backend data
  const { data: districts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: () => getDistricts(),
  });

  const { data: rivers = [] } = useQuery({
    queryKey: ['rivers'],
    queryFn: () => getRiverStations(),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['nearbyReports'],
    queryFn: () => getNearbyReports(20.5937, 78.9629, 2000), // National radius
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => getNearbyFacilities(20.5937, 78.9629, 2000),
  });

  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleMapClick = (lat: number, lon: number) => {
    setInspectLocation({ lat, lon });
    if (onSelectDistrict) {
      onSelectDistrict('CUSTOM', `Location (${lat.toFixed(3)}, ${lon.toFixed(3)})`, lat, lon);
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-300 shadow-md bg-white">
      {/* Top Map Toolbar & Layer Controls */}
      <div className="absolute top-3 right-3 z-1000 bg-white/95 backdrop-blur-xs p-2.5 rounded-lg shadow-md border border-gray-200 text-xs flex flex-wrap items-center gap-2 max-w-sm sm:max-w-none">
        <div className="flex items-center gap-1 font-bold text-gray-800 pr-2 border-r border-gray-200">
          <Layers className="w-3.5 h-3.5 text-[#B79A62]" />
          <span>Layers</span>
        </div>

        <button
          onClick={() => toggleLayer('risk')}
          className={`px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
            layers.risk ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span>Districts</span>
        </button>

        <button
          onClick={() => toggleLayer('rivers')}
          className={`px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
            layers.rivers ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span>River Gauges</span>
        </button>

        <button
          onClick={() => toggleLayer('reports')}
          className={`px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
            layers.reports ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-600" />
          <span>Road Hazards</span>
        </button>

        <button
          onClick={() => toggleLayer('facilities')}
          className={`px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
            layers.facilities ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-600" />
          <span>Shelters/Hospitals</span>
        </button>
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
                <div className="p-1 space-y-1 text-xs">
                  <div className="font-bold text-sm text-gray-900">{d.name}</div>
                  <div className="text-gray-500">District Code: {d.code}</div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <RiskBadge level="green" size="sm" score={15} />
                    <span className="text-[10px] text-gray-500">Normal Range</span>
                  </div>
                  <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-600">
                    Click to load 24h rainfall & live river discharge.
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* River Gauging Stations */}
        {layers.rivers &&
          rivers.map((r) => (
            <Marker
              key={`river-${r.station_code}`}
              position={[r.lat, r.lon]}
              icon={createDivIcon('#2563EB', 'R')}
            >
              <Popup>
                <div className="p-1 space-y-1.5 text-xs">
                  <div className="font-bold text-sm text-blue-900 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" />
                    <span>{r.name}</span>
                  </div>
                  <div className="text-gray-600">River: <strong>{r.river_name}</strong></div>
                  <div className="text-gray-500 font-mono text-[11px]">
                    Lat: {r.lat.toFixed(3)}, Lon: {r.lon.toFixed(3)}
                  </div>
                  <div className="p-1.5 rounded bg-blue-50 border border-blue-200 text-[11px] text-blue-800">
                    Source: GloFAS / Open-Meteo telemetry model.
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Community Hazards / Road Blocks */}
        {layers.reports &&
          reports.map((rep) => (
            <Marker
              key={`rep-${rep.id}`}
              position={[rep.lat, rep.lon]}
              icon={createDivIcon('#EA580C', '!')}
            >
              <Popup>
                <div className="p-1 space-y-1.5 text-xs">
                  <div className="font-bold text-amber-900 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                    <span className="uppercase">{rep.category.replace('_', ' ')}</span>
                  </div>
                  <p className="text-gray-700">{rep.description}</p>
                  {rep.water_depth_cm && (
                    <div className="text-xs text-red-700 font-semibold">
                      Estimated Water Depth: ~{rep.water_depth_cm} cm
                    </div>
                  )}
                  {rep.road_blocked && (
                    <div className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px] inline-block">
                      ROAD BLOCKED
                    </div>
                  )}
                  <div className="text-[10px] text-gray-500 pt-1">
                    Reported {formatRelativeTime(rep.submitted_at)} • Status: {rep.status}
                  </div>
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
              icon={createDivIcon('#DC2626', 'H')}
            >
              <Popup>
                <div className="p-1 space-y-1.5 text-xs">
                  <div className="font-bold text-gray-900 flex items-center gap-1">
                    <Hospital className="w-3.5 h-3.5 text-red-600" />
                    <span>{f.name}</span>
                  </div>
                  <div className="text-gray-600">{f.address || 'Address on record'}</div>
                  {f.phone && <div className="text-gray-700">Phone: {f.phone}</div>}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-semibold uppercase">
                      {f.facility_type}
                    </span>
                    {f.is_verified && (
                      <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 text-[10px] font-semibold">
                        Verified Facility
                      </span>
                    )}
                  </div>
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
            <span>Below Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span>Watch</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span>High Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600" />
            <span>Severe Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600" />
            <span>River Gauge</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-700" />
            <span>Hospital/Shelter</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-gray-700">
          <Info className="w-3.5 h-3.5" />
          <span>Click anywhere on map to query coordinates</span>
        </div>
      </div>
    </div>
  );
};
