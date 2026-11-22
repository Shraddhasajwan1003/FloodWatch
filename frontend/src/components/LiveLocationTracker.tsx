import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getFloodRisk,
  getAlerts,
  getNearbyFacilities,
  updateUserLocation,
} from '@/lib/api';
import type { OfficialAlert, Facility, FloodRiskResponse } from '@/types';
import {
  ShieldAlert,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  XCircle,
  PhoneCall,
  Hospital,
  ChevronRight,
  Volume2,
  X,
  Compass,
  Navigation,
} from 'lucide-react';

export const LiveLocationTracker: React.FC = () => {
  const { user, isTrackingGps } = useAuth();
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [activeAlert, setActiveAlert] = useState<OfficialAlert | null>(null);
  const [nearbyShelters, setNearbyShelters] = useState<Facility[]>([]);
  const [floodRisk, setFloodRisk] = useState<FloodRiskResponse | null>(null);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [dismissedUntil, setDismissedUntil] = useState<number>(0);
  const lastCoordsRef = useRef<{ lat: number; lon: number } | null>(null);

  // Poll GPS every 10 seconds
  useEffect(() => {
    if (!isTrackingGps || !navigator.geolocation) return;

    const checkLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(4));
          const lon = Number(pos.coords.longitude.toFixed(4));
          setCurrentCoords({ lat, lon });

          // Update backend if coordinates moved > 0.01 (~1km) or first time
          const prev = lastCoordsRef.current;
          if (!prev || Math.hypot(prev.lat - lat, prev.lon - lon) > 0.008) {
            lastCoordsRef.current = { lat, lon };
            if (user) {
              updateUserLocation(lat, lon).catch(() => {});
            }

            // Check risk and alerts for this coordinate
            try {
              const [risk, alerts, facilities] = await Promise.all([
                getFloodRisk(lat, lon),
                getAlerts(),
                getNearbyFacilities(lat, lon, 15, 'shelter'),
              ]);

              setFloodRisk(risk);
              setNearbyShelters(facilities.slice(0, 3));

              // If risk is orange/red or active alerts exist, trigger warning pop-up
              const matchingAlert = alerts.find(
                (a) => a.is_active && (a.severity === 'severe' || a.severity === 'extreme' || a.severity === 'warning')
              );

              if (matchingAlert || risk.displayed_level === 'orange' || risk.displayed_level === 'red') {
                setActiveAlert(matchingAlert || {
                  id: 9999,
                  alert_id: 'LOCAL-HIGH-RAIN',
                  source_id: 'jaldrishti-radar',
                  issuer: 'JalDrishti Real-Time Weather Radar',
                  severity: risk.displayed_level === 'red' ? 'extreme' : 'warning',
                  hazard_type: 'flood',
                  headline: `Elevated Flood Hazard Detected at Current Position (${risk.score?.toFixed(0)}/100)`,
                  description: `Localized rainfall (${risk.rainfall_1h_mm || 0}mm past hr) and saturated catchment in your immediate vicinity.`,
                  effective_at: new Date().toISOString(),
                  retrieved_at: new Date().toISOString(),
                  is_active: true,
                });

                if (Date.now() > dismissedUntil) {
                  setShowPopup(true);
                }
              }
            } catch (err) {
              console.log('Location hazard polling check:', err);
            }
          }
        },
        (err) => {
          // Graceful permission handling
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    };

    checkLocation();
    const interval = setInterval(checkLocation, 10000); // 10-second live polling
    return () => clearInterval(interval);
  }, [isTrackingGps, user, dismissedUntil]);

  const handleSnooze = () => {
    setShowPopup(false);
    setDismissedUntil(Date.now() + 5 * 60 * 1000); // Snooze for 5 minutes
  };

  if (!showPopup || !activeAlert) return null;

  const dosList = activeAlert.dos_and_donts?.dos || [
    'Move to higher floor or designated cyclone shelter immediately.',
    'Switch off electrical MCB switch if water approaches your premises.',
    'Boil all drinking water for at least 1 minute or use purification drops.',
  ];

  const dontsList = activeAlert.dos_and_donts?.donts || [
    'DO NOT attempt to cross flowing water on foot or in two-wheelers/cars.',
    'DO NOT enter basements or low-lying underground coaching/parking areas.',
    'DO NOT touch submerged electrical poles or hanging utility cables.',
  ];

  return (
    <div className="fixed inset-0 z-[2500] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border-2 border-red-500 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Top Warning Banner */}
        <div className="flex items-start justify-between border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 animate-bounce">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-red-100 text-red-800 uppercase tracking-wider">
                10-Second Live GPS Threat Detection
              </span>
              <h3 className="text-lg font-extrabold text-gray-900 leading-tight mt-0.5">
                {activeAlert.headline}
              </h3>
            </div>
          </div>
          <button onClick={handleSnooze} className="text-gray-400 hover:text-gray-600 font-bold text-lg">
            ✕
          </button>
        </div>

        {/* Location Details */}
        <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-950 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-red-800">
            <MapPin className="w-4 h-4 text-red-600 shrink-0" />
            <span>Your GPS Coordinates: {currentCoords ? `${currentCoords.lat.toFixed(4)}°N, ${currentCoords.lon.toFixed(4)}°E` : 'Current Area'}</span>
          </div>
          <p className="text-[11px] text-gray-700 leading-relaxed">
            {activeAlert.description || 'Statutory weather hazard active in your immediate zone. Immediate precautionary measures required.'}
          </p>
        </div>

        {/* Actionable NDMA Dos and Don'ts */}
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1.5">
            <span className="font-bold text-emerald-900 text-xs flex items-center gap-1 uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Immediate Actions (DOs)</span>
            </span>
            <ul className="space-y-1 text-gray-800 text-[11px]">
              {dosList.slice(0, 3).map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-700 font-bold shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-1.5">
            <span className="font-bold text-red-900 text-xs flex items-center gap-1 uppercase tracking-wider">
              <XCircle className="w-3.5 h-3.5 text-red-600" />
              <span>Prohibited Actions (DON'Ts)</span>
            </span>
            <ul className="space-y-1 text-gray-800 text-[11px]">
              {dontsList.slice(0, 3).map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-red-600 font-bold shrink-0">✕</span>
                  <span className="font-medium text-red-950">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Nearest Designated Evacuation Shelters */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-800 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Hospital className="w-3.5 h-3.5 text-blue-600" />
              <span>Nearest Designated Evacuation Shelters ({nearbyShelters.length})</span>
            </span>
            <a href="/facilities" className="text-blue-600 text-[11px] hover:underline normal-case">
              View all
            </a>
          </div>

          <div className="space-y-2">
            {nearbyShelters.length === 0 ? (
              <div className="p-3 rounded-xl bg-gray-50 text-gray-600 text-xs border border-gray-200">
                Searching nearest official facilities. Follow vertical evacuation to highest concrete structure.
              </div>
            ) : (
              nearbyShelters.map((s) => (
                <div
                  key={s.id}
                  className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between text-xs"
                >
                  <div className="truncate pr-2">
                    <strong className="text-gray-900 block truncate">{s.name}</strong>
                    <span className="text-gray-500 text-[11px] truncate block">{s.address}</span>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {s.phone && (
                      <a
                        href={`tel:${s.phone}`}
                        className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Emergency Actions & Snooze */}
        <div className="pt-2 border-t flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <a
              href="tel:112"
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1 font-mono uppercase"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>SOS 112</span>
            </a>
            <a
              href="tel:1078"
              className="px-4 py-2 rounded-lg bg-[#101820] hover:bg-gray-800 text-white font-bold flex items-center gap-1 font-mono uppercase"
            >
              <span>NDMA 1078</span>
            </a>
          </div>

          <button
            onClick={handleSnooze}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 font-semibold text-gray-700"
          >
            Acknowledge & Snooze (5m)
          </button>
        </div>
      </div>
    </div>
  );
};
