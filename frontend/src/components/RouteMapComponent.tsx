import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { RouteOption, Facility } from '@/types';
import { RiskBadge } from '@/components/RiskBadge';
import { AlertTriangle, Hospital, ShieldCheck, MapPin, Navigation } from 'lucide-react';

interface RouteMapProps {
  origin: { lat: number; lon: number; name?: string };
  destination: { lat: number; lon: number; name?: string };
  routes: RouteOption[];
  selectedRouteId: string;
  onSelectRoute: (id: string) => void;
  facilities?: Facility[];
  height?: string;
}

// Convert GeoJSON [[lon, lat], ...] to Leaflet [[lat, lon], ...]
function extractPolylineCoordinates(geometry: any, origin: { lat: number; lon: number }, dest: { lat: number; lon: number }): [number, number][] {
  if (!geometry) {
    return [
      [origin.lat, origin.lon],
      [dest.lat, dest.lon],
    ];
  }

  // GeoJSON LineString
  if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
  }

  // Array of coordinates
  if (Array.isArray(geometry)) {
    if (geometry.length > 0 && Array.isArray(geometry[0])) {
      // Check if [lon, lat] or [lat, lon]
      if (geometry[0][0] > 60 && geometry[0][1] < 40) {
        // [lon, lat] for India
        return geometry.map((pt: number[]) => [pt[1], pt[0]]);
      }
      return geometry as [number, number][];
    }
  }

  return [
    [origin.lat, origin.lon],
    [dest.lat, dest.lon],
  ];
}

const createPinIcon = (color: string, label: string) => {
  return L.divIcon({
    className: 'custom-route-marker',
    html: `
      <div style="background-color: ${color}; width: 26px; height: 26px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 800; font-family: sans-serif;">
        ${label}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

const MapBoundsAdjuster: React.FC<{ coordinates: [number, number][] }> = ({ coordinates }) => {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length >= 2) {
      const bounds = L.latLngBounds(coordinates.map((c) => L.latLng(c[0], c[1])));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [coordinates, map]);

  return null;
};

export const RouteMapComponent: React.FC<RouteMapProps> = ({
  origin,
  destination,
  routes,
  selectedRouteId,
  onSelectRoute,
  facilities = [],
  height = '480px',
}) => {
  const activeRoute = routes.find((r) => r.route_id === selectedRouteId) || routes[0];

  // Collect all coordinates to fit bounds
  const allCoords: [number, number][] = [
    [origin.lat, origin.lon],
    [destination.lat, destination.lon],
  ];

  if (activeRoute) {
    const pts = extractPolylineCoordinates(activeRoute.geometry, origin, destination);
    allCoords.push(...pts);
  }

  const getRouteColor = (pref: string, level: string, isSelected: boolean) => {
    if (!isSelected) return '#94A3B8'; // Muted slate for non-selected
    if (level === 'red') return '#DC2626';
    if (level === 'orange') return '#EA580C';
    if (level === 'yellow') return '#CA8A04';
    return '#16A34A'; // Safe / green
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height }}>
      <MapContainer
        center={[origin.lat, origin.lon]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsAdjuster coordinates={allCoords} />

        {/* Origin Marker */}
        <Marker
          position={[origin.lat, origin.lon]}
          icon={createPinIcon('#16A34A', 'A')}
        >
          <Popup>
            <div className="text-xs space-y-1">
              <div className="font-bold text-emerald-800 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5" />
                <span>Origin (Start Point)</span>
              </div>
              <div className="text-gray-700">{origin.name || 'Selected Origin'}</div>
              <div className="font-mono text-[10px] text-gray-500">
                {origin.lat.toFixed(4)}, {origin.lon.toFixed(4)}
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Destination Marker */}
        <Marker
          position={[destination.lat, destination.lon]}
          icon={createPinIcon('#DC2626', 'B')}
        >
          <Popup>
            <div className="text-xs space-y-1">
              <div className="font-bold text-red-800 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>Destination Point</span>
              </div>
              <div className="text-gray-700">{destination.name || 'Selected Destination'}</div>
              <div className="font-mono text-[10px] text-gray-500">
                {destination.lat.toFixed(4)}, {destination.lon.toFixed(4)}
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Alternative Routes Polylines (Background) */}
        {routes.map((rt) => {
          const isSelected = rt.route_id === selectedRouteId;
          if (isSelected) return null; // Render selected on top
          const pts = extractPolylineCoordinates(rt.geometry, origin, destination);
          return (
            <Polyline
              key={rt.route_id}
              positions={pts}
              pathOptions={{
                color: '#94A3B8',
                weight: 4,
                opacity: 0.6,
                dashArray: '6, 8',
              }}
              eventHandlers={{
                click: () => onSelectRoute(rt.route_id),
              }}
            />
          );
        })}

        {/* Active Selected Route Polyline (Foreground) */}
        {activeRoute && (
          <Polyline
            key={`selected-${activeRoute.route_id}`}
            positions={extractPolylineCoordinates(activeRoute.geometry, origin, destination)}
            pathOptions={{
              color: getRouteColor(activeRoute.preference, activeRoute.flood_exposure_label, true),
              weight: 6,
              opacity: 0.95,
            }}
          />
        )}

        {/* Road Hazard Markers from Active Route */}
        {activeRoute?.road_closures?.map((hazard, idx) => {
          // Estimate intermediate hazard position along polyline
          const pts = extractPolylineCoordinates(activeRoute.geometry, origin, destination);
          const pos = pts[Math.min(idx * 8 + 4, pts.length - 1)] || [origin.lat, origin.lon];
          return (
            <Marker
              key={`hazard-${idx}`}
              position={pos}
              icon={createPinIcon('#DC2626', '!')}
            >
              <Popup>
                <div className="text-xs p-1 space-y-1">
                  <div className="font-bold text-red-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Reported Flood Hazard</span>
                  </div>
                  <div className="text-gray-700">{hazard}</div>
                  <div className="text-[10px] text-red-600 font-semibold">
                    Traffic detour / waterlogging alert active
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Nearby Facilities / Shelters */}
        {facilities.slice(0, 8).map((f) => (
          <Marker
            key={`fac-${f.id}`}
            position={[f.lat, f.lon]}
            icon={createPinIcon(f.facility_type === 'hospital' ? '#0284C7' : '#B79A62', f.facility_type === 'hospital' ? 'H' : 'S')}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <div className="font-bold text-gray-900 flex items-center gap-1">
                  {f.facility_type === 'hospital' ? <Hospital className="w-3.5 h-3.5 text-blue-600" /> : <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />}
                  <span>{f.name}</span>
                </div>
                <div className="text-gray-600 text-[11px]">{f.address}</div>
                {f.phone && <div className="text-blue-600 font-mono text-[11px]">📞 {f.phone}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating Map Legend Overlay */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-gray-200 shadow-md text-xs space-y-2 pointer-events-auto max-w-[210px]">
        <div className="font-bold text-gray-800 text-[11px] uppercase tracking-wider border-b pb-1">
          Route Map Legend
        </div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block shrink-0"></span>
            <span className="text-gray-700">Origin Point (A)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block shrink-0"></span>
            <span className="text-gray-700">Destination (B)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-[#16A34A] rounded inline-block shrink-0"></span>
            <span className="text-gray-700">Active Safe Route</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-gray-400 inline-block shrink-0"></span>
            <span className="text-gray-500">Alternative Options</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 text-[8px] text-white font-bold flex items-center justify-center shrink-0">!</span>
            <span className="text-red-700">Road Blockage / Flood</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-sky-600 text-[8px] text-white font-bold flex items-center justify-center shrink-0">H</span>
            <span className="text-sky-800">Hospital / Shelter</span>
          </div>
        </div>
        {activeRoute && (
          <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-mono">
              {(activeRoute.distance_m / 1000).toFixed(1)} km
            </span>
            <RiskBadge level={activeRoute.flood_exposure_label} size="sm" score={Math.round(activeRoute.flood_exposure_score || 0)} />
          </div>
        )}
      </div>
    </div>
  );
};
