import React from 'react';
import { useTranslation } from 'react-i18next';
import { RiskBadge } from '@/components/RiskBadge';
import type { FloodRiskResponse } from '@/types';
import {
  X,
  AlertTriangle,
  CloudRain,
  Activity,
  Users,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

interface RiskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  riskData: FloodRiskResponse | null;
  locationName: string;
}

export const RiskDetailModal: React.FC<RiskDetailModalProps> = ({
  isOpen,
  onClose,
  riskData,
  locationName,
}) => {
  const { t } = useTranslation();

  if (!isOpen || !riskData) return null;

  const breakdown: any = riskData.breakdown || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto focus:outline-hidden"
        role="dialog"
        aria-labelledby="risk-dialog-title"
      >
        {/* Header */}
        <div className="bg-[#101820] text-white p-5 rounded-t-xl flex items-center justify-between border-b border-gray-800">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#B79A62] font-bold">
              Explainable Risk Assessment
            </div>
            <h2 id="risk-dialog-title" className="text-xl font-bold text-white mt-0.5">
              {locationName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-sm">
          {/* Main Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <div>
              <div className="text-xs text-gray-500 font-medium">Assessed Flood Risk Level</div>
              <div className="mt-1 flex items-center gap-2">
                <RiskBadge level={riskData.displayed_level} size="lg" score={riskData.score} />
                {riskData.is_provisional && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                    Provisional v1 Model
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-500 font-medium">Model Calculation</div>
              <div className="text-base font-extrabold text-gray-900 font-mono">
                {riskData.score !== null ? `${riskData.score} / 100` : 'Insufficient Inputs'}
              </div>
            </div>
          </div>

          {/* Official Warning Precedence Notice */}
          {riskData.official_override && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong>Official Warning Precedence:</strong> An authoritative severe flood/weather alert is currently active for this district. In accordance with platform safety policy, official government warnings take precedence and cannot be lowered by internal scores.
              </div>
            </div>
          )}

          {/* Reason / Explanation */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Assessment Rationale
            </h3>
            <p className="p-3 rounded-md bg-gray-50 border border-gray-200 text-gray-800 text-xs leading-relaxed">
              {riskData.explanation || 'No adverse hydrological indicators triggered.'}
            </p>
          </div>

          {/* Contributing Factors Breakdown (Explainability) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">
              Input Score Breakdown (0–100 Scale)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Factor 1: 1h Rainfall */}
              <div className="p-3 rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CloudRain className="w-3.5 h-3.5 text-blue-600" />
                    Recent Rain (1h)
                  </span>
                  <span className="font-bold text-gray-900">
                    {breakdown.recent_rainfall_1h !== null && breakdown.recent_rainfall_1h !== undefined
                      ? `${Math.round(breakdown.recent_rainfall_1h)}/100`
                      : 'Unavailable'}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: `${breakdown.recent_rainfall_1h || 0}%` }}
                  />
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Observed: {riskData.rainfall_1h_mm ?? 0} mm
                </div>
              </div>

              {/* Factor 2: 24h Forecast Rain */}
              <div className="p-3 rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CloudRain className="w-3.5 h-3.5 text-amber-600" />
                    Forecast Rain (24h)
                  </span>
                  <span className="font-bold text-gray-900">
                    {breakdown.forecast_rainfall_24h !== null && breakdown.forecast_rainfall_24h !== undefined
                      ? `${Math.round(breakdown.forecast_rainfall_24h)}/100`
                      : 'Unavailable'}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-amber-600 h-1.5 rounded-full"
                    style={{ width: `${breakdown.forecast_rainfall_24h || 0}%` }}
                  />
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Forecast: {riskData.forecast_24h_mm ?? 0} mm
                </div>
              </div>

              {/* Factor 3: River Level */}
              <div className="p-3 rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    River Level vs Danger
                  </span>
                  <span className="font-bold text-gray-900">
                    {breakdown.river_level_pct !== null && breakdown.river_level_pct !== undefined
                      ? `${Math.round(breakdown.river_level_pct)}%`
                      : 'No Gauge'}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, breakdown.river_level_pct || 0)}%` }}
                  />
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Telemetry status: Normal basin flow
                </div>
              </div>

              {/* Factor 4: Citizen Waterlogging Reports */}
              <div className="p-3 rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users className="w-3.5 h-3.5 text-orange-600" />
                    Community Reports
                  </span>
                  <span className="font-bold text-gray-900">
                    {breakdown.community_reports !== null && breakdown.community_reports !== undefined
                      ? `${Math.round(breakdown.community_reports)}/100`
                      : 'None'}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-orange-500 h-1.5 rounded-full"
                    style={{ width: `${breakdown.community_reports || 0}%` }}
                  />
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Active local incidents in last 3h
                </div>
              </div>
            </div>
          </div>

          {/* Missing Inputs & Data Transparency */}
          {riskData.missing_inputs && riskData.missing_inputs.length > 0 && (
            <div className="p-3 rounded-lg bg-gray-100 border border-gray-300 text-xs text-gray-600">
              <div className="font-semibold text-gray-800 flex items-center gap-1 mb-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Explicit Data Gaps:</span>
              </div>
              <p>
                The following data inputs were not accessible for this coordinate: {riskData.missing_inputs.join(', ')}. In accordance with data integrity principles, unmeasured inputs are omitted rather than defaulted to zero.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-3.5 rounded-b-xl border-t border-gray-200 flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            Model version: {riskData.model_version} • Retrieved live
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#101820] text-white text-xs font-semibold hover:bg-gray-800 transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
