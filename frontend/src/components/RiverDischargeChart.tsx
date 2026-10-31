import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { RiverDischargeDay, RiverStation } from '@/types';
import { Activity, AlertCircle, Info } from 'lucide-react';

interface RiverDischargeChartProps {
  station: RiverStation;
  daily: RiverDischargeDay[];
  attribution?: string;
}

export const RiverDischargeChart: React.FC<RiverDischargeChartProps> = ({
  station,
  daily,
  attribution = 'Open-Meteo Flood API / GloFAS hydrological model (CC BY 4.0)',
}) => {
  if (!daily || daily.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200 text-gray-500 text-xs">
        No river discharge telemetry available for {station.name}.
      </div>
    );
  }

  const chartData = daily.map((d) => {
    const dt = new Date(d.valid_date);
    return {
      date: dt.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }),
      discharge: d.river_discharge_m3s ?? 0,
    };
  });

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-blue-100 text-blue-700">
              <Activity className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-gray-900">{station.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
              River {station.river_name}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Modeled 7-day river discharge forecast in cubic meters per second (m³/s).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {station.danger_level_m && (
            <div className="px-2.5 py-1 rounded bg-red-50 border border-red-200 text-xs text-red-800 font-semibold">
              Danger Mark: {station.danger_level_m} m
            </div>
          )}
          {station.warning_level_m && (
            <div className="px-2.5 py-1 rounded bg-yellow-50 border border-yellow-200 text-xs text-yellow-800 font-semibold">
              Warning Mark: {station.warning_level_m} m
            </div>
          )}
        </div>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} unit=" m³/s" />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload;
                  return (
                    <div className="bg-[#101820] text-white p-2.5 rounded-md shadow-lg text-xs space-y-1">
                      <div className="font-semibold text-gray-200">{p.date}</div>
                      <div className="text-blue-300 font-bold">
                        Estimated Discharge: {p.discharge.toLocaleString()} m³/s
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="discharge" fill="#2563EB" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-start gap-1.5 text-[11px] text-gray-500">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
        <p>
          <strong>Hydrological Caveat:</strong> {attribution}. Values represent a continental-scale hydrodynamic model estimate and may differ from on-ground Central Water Commission (CWC) staff gauge observations.
        </p>
      </div>
    </div>
  );
};
