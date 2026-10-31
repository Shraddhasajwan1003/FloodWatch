import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calculateRoutes, getNearbyFacilities, searchLocation } from '@/lib/api';
import { RiskBadge } from '@/components/RiskBadge';
import type { RoutesResponse, RouteOption, Facility, SearchResult } from '@/types';
import {
  Compass,
  MapPin,
  Navigation,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Hospital,
  ChevronRight,
  Loader2,
  Info,
  ArrowRight,
} from 'lucide-react';

export const SafeRoutesPage: React.FC = () => {
  // Preset locations for quick testing (e.g. Guwahati GMCH to Shelter, Delhi CP to AIIMS)
  const [originText, setOriginText] = useState('Connaught Place, New Delhi');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lon: number }>({
    lat: 28.6315,
    lon: 77.2167,
  });

  const [destText, setDestText] = useState('Safdarjung Hospital, New Delhi');
  const [destCoords, setDestCoords] = useState<{ lat: number; lon: number }>({
    lat: 28.5701,
    lon: 77.2078,
  });

  const [selectedRouteId, setSelectedRouteId] = useState<string>('fastest');
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeResult, setRouteResult] = useState<RoutesResponse | null>(null);

  // Nearby facilities to choose as destination
  const { data: facilities = [] } = useQuery({
    queryKey: ['facilitiesSafeRoute', originCoords.lat, originCoords.lon],
    queryFn: () => getNearbyFacilities(originCoords.lat, originCoords.lon, 50),
  });

  const handleCalculate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsCalculating(true);
    try {
      const res = await calculateRoutes(
        originCoords.lat,
        originCoords.lon,
        destCoords.lat,
        destCoords.lon
      );
      setRouteResult(res);
      if (res.routes && res.routes.length > 0) {
        setSelectedRouteId(res.routes[0].route_id);
      }
    } catch (err) {
      console.error(err);
      alert('Could not calculate route. Ensure locations are within road network bounds.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handlePickFacilityAsDest = (f: Facility) => {
    setDestText(`${f.name} (${f.facility_type})`);
    setDestCoords({ lat: f.lat, lon: f.lon });
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setOriginText('Current GPS Location');
          setOriginCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => alert('Location access denied.')
      );
    }
  };

  const activeRoute = routeResult?.routes.find((r) => r.route_id === selectedRouteId) || routeResult?.routes[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-[#B79A62]">
          Emergency Navigation
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1 flex items-center gap-2">
          <Compass className="w-7 h-7 text-[#B79A62]" />
          <span>Emergency Safe-Route Planner</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 max-w-3xl mt-1">
          Compares driving routes based on estimated travel time and flood hazard exposure. Accounts for verified road closures, submerged underpasses, and reported waterlogged intersections.
        </p>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Life-Safety Notice:</strong> Routes labeled "Lower Estimated Exposure" reflect lower modeled flood risk along mapped corridors. However, conditions can deteriorate rapidly during cloudbursts. Never enter a flooded road or submerged underpass under any circumstances.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Route Setup & Facility Quick-Pick */}
        <div className="space-y-5">
          {/* Form */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Journey Waypoints
            </h2>

            {/* Origin */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-1">
                <span>Origin Point</span>
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  className="text-[#B79A62] hover:underline flex items-center gap-1"
                >
                  <Navigation className="w-3 h-3" />
                  <span>My GPS</span>
                </button>
              </div>
              <div className="relative">
                <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                <input
                  type="text"
                  value={originText}
                  onChange={(e) => setOriginText(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-gray-300"
                />
              </div>
              <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                Lat: {originCoords.lat.toFixed(4)}, Lon: {originCoords.lon.toFixed(4)}
              </div>
            </div>

            {/* Destination */}
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">Destination Point</div>
              <div className="relative">
                <MapPin className="w-4 h-4 text-red-600 absolute left-3 top-3" />
                <input
                  type="text"
                  value={destText}
                  onChange={(e) => setDestText(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-gray-300"
                />
              </div>
              <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                Lat: {destCoords.lat.toFixed(4)}, Lon: {destCoords.lon.toFixed(4)}
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={() => handleCalculate()}
              disabled={isCalculating}
              className="w-full py-3 rounded-md bg-[#B79A62] hover:bg-[#a68953] text-[#101820] text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating Flood Exposure...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4" />
                  <span>Find Safer Route Alternatives</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Destination: Hospitals & Shelters */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Hospital className="w-4 h-4 text-red-600" />
              <span>Route to Nearby Safe Facility</span>
            </div>
            <p className="text-xs text-gray-500">
              Click any verified medical center or evacuation shelter to set as destination:
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {facilities.slice(0, 5).map((f) => (
                <button
                  key={f.id}
                  onClick={() => handlePickFacilityAsDest(f)}
                  className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:border-[#B79A62] hover:bg-amber-50/30 transition-all text-xs space-y-1 group"
                >
                  <div className="font-bold text-gray-900 group-hover:text-[#B79A62] flex items-center justify-between">
                    <span>{f.name}</span>
                    <span className="text-[10px] uppercase font-semibold text-gray-500">
                      {f.facility_type}
                    </span>
                  </div>
                  <div className="text-gray-500 text-[11px] truncate">{f.address}</div>
                  {f.distance_km !== undefined && (
                    <div className="text-[#B79A62] font-semibold text-[11px]">
                      ~{f.distance_km} km away
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Route Alternatives & Comparison */}
        <div className="lg:col-span-2 space-y-6">
          {routeResult ? (
            <div className="space-y-5">
              {/* Route Preference Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {routeResult.routes.map((rt) => {
                  const isSelected = rt.route_id === selectedRouteId;
                  const durationMins = Math.round(rt.duration_s / 60);
                  const distanceKm = (rt.distance_m / 1000).toFixed(1);

                  return (
                    <div
                      key={rt.route_id}
                      onClick={() => setSelectedRouteId(rt.route_id)}
                      className={`cursor-pointer rounded-xl p-4 border transition-all shadow-xs ${
                        isSelected
                          ? 'border-[#B79A62] ring-2 ring-[#B79A62] bg-amber-50/20'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs uppercase tracking-wide text-gray-800">
                          {rt.preference === 'fastest'
                            ? '⚡ Fastest Route'
                            : rt.preference === 'lower_risk'
                            ? '🛡️ Lower Flood Exposure'
                            : '⚖️ Balanced Alternative'}
                        </span>
                        <RiskBadge level={rt.flood_exposure_label} size="sm" score={Math.round(rt.flood_exposure_score || 0)} />
                      </div>

                      <div className="flex items-baseline gap-3 my-2">
                        <div className="text-2xl font-extrabold text-gray-900 font-mono">
                          {durationMins} <span className="text-xs font-normal text-gray-500">mins</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-600 font-mono">
                          {distanceKm} km
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                        {rt.explanation}
                      </p>

                      {rt.road_closures && rt.road_closures.length > 0 && (
                        <div className="text-[11px] font-semibold text-red-700 bg-red-50 p-1.5 rounded border border-red-200 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Avoids {rt.road_closures.length} reported road blockage(s)</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Selected Route Turn-by-Turn Directions */}
              {activeRoute && (
                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#B79A62]" />
                      <span>Directions for Selected Route</span>
                    </h3>
                    <span className="text-xs text-gray-500 font-medium">
                      Total: {(activeRoute.distance_m / 1000).toFixed(1)} km • ~{Math.round(activeRoute.duration_s / 60)} mins
                    </span>
                  </div>

                  {/* Steps list */}
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {activeRoute.steps && activeRoute.steps.length > 0 ? (
                      activeRoute.steps.map((st, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-gray-50 border border-gray-100 flex items-start justify-between text-xs"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-[#101820] text-white flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-semibold text-gray-900">{st.instruction}</div>
                              {st.warning_note && (
                                <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                                  ⚠️ {st.warning_note}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] text-gray-500 font-mono shrink-0 ml-3">
                            {st.distance_m > 1000
                              ? `${(st.distance_m / 1000).toFixed(1)} km`
                              : `${Math.round(st.distance_m)} m`}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-gray-500">
                        Turn directions generated via OSRM engine.
                      </div>
                    )}
                  </div>

                  {/* Route Uncertainty Caveat */}
                  <div className="p-3 rounded-lg bg-gray-100 text-[11px] text-gray-600 flex items-start gap-2">
                    <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                    <span>{activeRoute.uncertainty}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 border border-dashed border-gray-300 text-center space-y-4">
              <Compass className="w-12 h-12 text-[#B79A62] mx-auto opacity-75" />
              <div>
                <h3 className="text-base font-bold text-gray-900">Ready to Calculate Flood-Aware Routes</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                  Click the "Find Safer Route Alternatives" button on the left to evaluate candidate paths between your origin and destination.
                </p>
              </div>
              <button
                onClick={() => handleCalculate()}
                className="px-6 py-2.5 rounded-md bg-[#101820] hover:bg-gray-800 text-white text-xs font-bold transition-all shadow-xs"
              >
                Calculate Sample Route (Delhi CP → Safdarjung Hospital)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
