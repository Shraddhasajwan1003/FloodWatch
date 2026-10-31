import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { RainfallHour } from '@/types';
import { CloudRain, Info } from 'lucide-react';

interface RainfallChartProps {
  data: RainfallHour[];
  total24h?: number | null;
  forecast24h?: number | null;
  locationName?: string;
  attribution?: string;
}

export const RainfallChart: React.FC<RainfallChartProps> = ({
  data,
  total24h,
  forecast24h,
  locationName,
  attribution = 'Open-Meteo.com model reanalysis & forecast',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200 text-gray-500 text-xs">
        No hourly rainfall points available for this location.
      </div>
    );
  }

  // Format data for Recharts
  const chartData = data.slice(0, 36).map((item) => {
    const d = new Date(item.valid_at);
    return {
      time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      precipitation: item.precipitation_mm ?? 0,
      probability: item.precipitation_probability_pct ?? 0,
      temp: item.temperature_2m_c,
      isForecast: item.data_type === 'forecast',
    };
  });

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-blue-600" />
            <span>Hourly Precipitation Timeline {locationName ? `— ${locationName}` : ''}</span>
          </h3>
          <p className="text-xs text-gray-500">
            Hourly rain accumulation (mm). Forecast outlook starts from current hour.
          </p>
        </div>

        {/* Metric summary pills */}
        <div className="flex items-center gap-3">
          {total24h !== undefined && total24h !== null && (
            <div className="px-3 py-1 rounded bg-blue-50 border border-blue-200 text-xs">
              <span className="text-blue-700 font-medium">Past 24h: </span>
              <span className="font-bold text-blue-900">{total24h} mm</span>
            </div>
          )}
          {forecast24h !== undefined && forecast24h !== null && (
            <div className="px-3 py-1 rounded bg-amber-50 border border-amber-200 text-xs">
              <span className="text-amber-700 font-medium">Forecast 24h: </span>
              <span className="font-bold text-amber-900">{forecast24h} mm</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart container */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="precipGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              interval={3}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              unit="mm"
              domain={[0, 'auto']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload;
                  return (
                    <div className="bg-[#101820] text-white p-2.5 rounded-md shadow-lg text-xs space-y-1">
                      <div className="font-semibold text-gray-200">
                        {p.date} • {p.time}
                      </div>
                      <div className="text-blue-300 font-bold">
                        Precipitation: {p.precipitation} mm
                      </div>
                      {p.probability > 0 && (
                        <div className="text-amber-300">
                          Precip Probability: {p.probability}%
                        </div>
                      )}
                      {p.temp !== null && p.temp !== undefined && (
                        <div className="text-gray-300">Temperature: {p.temp}°C</div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="precipitation"
              stroke="#2563EB"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#precipGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Data provenance & transparency disclaimer */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
        <div className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-gray-400" />
          <span>Source: {attribution}</span>
        </div>
        <span className="italic">Atmospheric model precipitation — not direct sensor observation</span>
      </div>
    </div>
  );
};
