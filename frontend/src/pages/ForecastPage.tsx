import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getForecasts, getDistricts, getRainfall } from '@/lib/api';
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
} from 'lucide-react';

export const ForecastPage: React.FC = () => {
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number; name: string }>({
    lat: 26.1445,
    lon: 91.7362,
    name: 'Guwahati (Kamrup), Assam',
  });

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-amber-600">
          Atmospheric & Hydrological Outlook
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1 flex items-center gap-2">
          <CloudRain className="w-7 h-7 text-amber-600" />
          <span>24-Hour & 7-Day Rainfall & Flood Outlook</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 max-w-3xl mt-1">
          Combines high-resolution atmospheric precipitation modeling with watershed hydrological risk projections.
        </p>
      </div>

      {/* Critical Scientific Disclaimer */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Essential Meteorological Distinction:</strong> A rainfall forecast predicts expected atmospheric precipitation depth in millimeters. It does <em>not</em> calculate street-level inundation, which is heavily governed by municipal stormwater pumps, low-lying underpasses, soil permeability, and river backflow.
        </div>
      </div>

      {/* Location Picker */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
          <MapPin className="w-4 h-4 text-[#B79A62]" />
          <span>Select Forecast Zone:</span>
        </div>

        <select
          value={selectedCoords.name}
          onChange={(e) => {
            const d = districts.find((it) => it.name === e.target.value);
            if (d) {
              setSelectedCoords({ lat: d.centroid_lat, lon: d.centroid_lon, name: d.name });
            }
          }}
          className="text-xs p-2 rounded-md border border-gray-300 bg-white font-semibold text-gray-800 focus:ring-1 focus:ring-[#B79A62]"
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
