import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getForecasts, getDistricts, getRainfall, getFloodRisk, getAlerts } from '@/lib/api';
import { RainfallChart } from '@/components/RainfallChart';
import { RiskBadge } from '@/components/RiskBadge';
import {
  CloudRain,
  Calendar,
  AlertTriangle,
  Info,
  MapPin,
  Loader2,
  TrendingUp,
  Navigation,
  ShieldCheck,
  Thermometer,
  Compass,
} from 'lucide-react';

export const ForecastPage: React.FC = () => {
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number; name: string }>({
    lat: 26.1445,
    lon: 91.7362,
    name: 'Kamrup (Guwahati), Assam',
  });
  const [isLocating, setIsLocating] = useState(false);

  const { data: districts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: () => getDistricts(),
  });

  const { data: forecastData, isLoading: isLoadingForecast } = useQuery({
    queryKey: ['forecast7Day', selectedCoords.lat, selectedCoords.lon],
    queryFn: () => getForecasts(selectedCoords.lat, selectedCoords.lon, 7),
  });

  const { data: hourlyRainfall, isLoading: isLoadingHourly } = useQuery({
    queryKey: ['hourlyRainfallForecast', selectedCoords.lat, selectedCoords.lon],
    queryFn: () => getRainfall(selectedCoords.lat, selectedCoords.lon, 48),
  });

  const { data: liveRisk } = useQuery({
    queryKey: ['locationRisk', selectedCoords.lat, selectedCoords.lon],
    queryFn: () => getFloodRisk(selectedCoords.lat, selectedCoords.lon),
  });

  const { data: allAlerts = [] } = useQuery({
    queryKey: ['alertsForecastPage'],
    queryFn: () => getAlerts(),
  });

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

        // Find closest district name
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
      (err) => {
        alert('Could not access your location. Please check browser permissions.');
        setIsLocating(false);
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-amber-600">
            Atmospheric & Hydrological Outlook
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1 flex items-center gap-2">
            <CloudRain className="w-7 h-7 text-amber-600" />
            <span>24-Hour & 7-Day Rainfall & Flood Outlook</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 max-w-3xl mt-1">
            Combines high-resolution atmospheric precipitation modeling with live watershed hydrological risk projections across 70+ Indian districts.
          </p>
        </div>

        <button
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#101820] hover:bg-gray-800 text-white text-xs font-bold transition-all shadow-sm shrink-0"
        >
          <Navigation className={`w-3.5 h-3.5 text-[#B79A62] ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Locating Device GPS...' : 'Use My Current Location'}</span>
        </button>
      </div>

      {/* Critical Scientific Disclaimer */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Essential Meteorological Distinction:</strong> A rainfall forecast predicts expected atmospheric precipitation depth in millimeters. It does <em>not</em> calculate street-level inundation, which is heavily governed by municipal stormwater pumps, low-lying underpasses, soil permeability, and river backflow.
        </div>
      </div>

      {/* Current Position Live Weather & Risk Summary Card */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-gray-900">{selectedCoords.name}</div>
              <div className="text-[11px] text-gray-500 font-mono">
                {selectedCoords.lat.toFixed(4)}°N, {selectedCoords.lon.toFixed(4)}°E
              </div>
            </div>
          </div>

          {liveRisk && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 font-semibold">Localized Risk:</span>
              <RiskBadge level={liveRisk.displayed_level} score={Math.round(liveRisk.score || 0)} size="md" />
            </div>
          )}
        </div>

        {/* Live Weather Metrics for Selected Location */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
            <span className="text-gray-500 text-[11px]">Past 1-Hour Rain</span>
            <div className="text-lg font-bold font-mono text-gray-900 mt-0.5">
              {hourlyRainfall?.total_1h_mm !== null && hourlyRainfall?.total_1h_mm !== undefined
                ? `${hourlyRainfall.total_1h_mm} mm`
                : '0.0 mm'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
            <span className="text-gray-500 text-[11px]">24-Hour Accumulation</span>
            <div className="text-lg font-bold font-mono text-blue-700 mt-0.5">
              {hourlyRainfall?.total_24h_mm !== null && hourlyRainfall?.total_24h_mm !== undefined
                ? `${hourlyRainfall.total_24h_mm} mm`
                : 'Calculating'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
            <span className="text-gray-500 text-[11px]">24-Hour Forecast Rain</span>
            <div className="text-lg font-bold font-mono text-amber-700 mt-0.5">
              {hourlyRainfall?.forecast_24h_mm !== null && hourlyRainfall?.forecast_24h_mm !== undefined
                ? `${hourlyRainfall.forecast_24h_mm} mm`
                : 'Generating'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
            <span className="text-gray-500 text-[11px]">Active Location Alerts</span>
            <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
              {allAlerts.length > 0 ? `${allAlerts.length} Advisory` : 'None Active'}
            </div>
          </div>
        </div>

        {liveRisk?.explanation && (
          <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-start gap-2">
            <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
            <span>{liveRisk.explanation}</span>
          </div>
        )}
      </div>

      {/* District Dropdown Selector */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
          <MapPin className="w-4 h-4 text-[#B79A62]" />
          <span>Switch to Any Supported District ({districts.length} available):</span>
        </div>

        <select
          value={selectedCoords.name}
          onChange={(e) => {
            const d = districts.find((it) => it.name === e.target.value);
            if (d) {
              setSelectedCoords({ lat: d.centroid_lat, lon: d.centroid_lon, name: d.name });
            }
          }}
          className="text-xs p-2.5 rounded-md border border-gray-300 bg-white font-semibold text-gray-800 focus:ring-1 focus:ring-[#B79A62] max-w-sm"
        >
          {districts.map((d) => (
            <option key={d.code} value={d.name}>
              {d.name} ({d.centroid_lat.toFixed(2)}°N, {d.centroid_lon.toFixed(2)}°E)
            </option>
          ))}
        </select>
      </div>

      {/* Section 1: Hourly 24h/48h Rainfall Curve */}
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

      {/* Section 2: 7-Day Hydrological Risk Sequence */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-700" />
          <span>7-Day Meteorological Outlook & Hydrological Concern Matrix</span>
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
              const dayStr = dt.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });

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
                        {day.total_precipitation_mm} <span className="text-xs text-gray-500 font-normal">mm</span>
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
};
