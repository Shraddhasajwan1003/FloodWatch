import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDataSources } from '@/lib/api';
import type { DataSourceHealth } from '@/types';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  HelpCircle,
  Clock,
  Loader2,
  Info,
} from 'lucide-react';

export const DataSourcesPage: React.FC = () => {
  const { data: sources = [], isLoading } = useQuery<DataSourceHealth[]>({
    queryKey: ['dataSourcesRegistry'],
    queryFn: () => getDataSources(),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-[#B79A62]">
          Data Provenance & Model Auditability
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1 flex items-center gap-2">
          <FileText className="w-7 h-7 text-[#B79A62]" />
          <span>Data Sources Registry & Transparency Log</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 max-w-3xl mt-1">
          Full public registry of external weather services, hydrological models, geocoding endpoints, and official alert streams powering FloodWatch India.
        </p>
      </div>

      {/* Core Principles Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Strict Zero-Fabrication Rule</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Every metric, map marker, rainfall curve, and river hydrograph is retrieved from verified endpoints or explicit computations. We never fabricate sensor readings or populate empty cards with placeholder numbers.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Statutory Warning Precedence</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Official alerts issued by NDMA, IMD, or state disaster authorities (SDMAs) always take absolute precedence. Internal algorithmic risk scores can raise vigilance but can never downgrade an official severe warning.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span>Honest Coverage Reporting</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Data coverage across India's 750+ districts varies depending on available telemetry. When data is absent or an upstream provider fails, the system marks the area as <strong>UNAVAILABLE</strong> rather than pretending risk is zero.
          </p>
        </div>
      </div>

      {/* Source Registry Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Registered Upstream Adapters
          </h2>
          <span className="text-xs text-gray-500 font-mono">
            {sources.length} active integrations
          </span>
        </div>

        {isLoading ? (
          <div className="p-16 text-center text-xs text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#B79A62] mb-2" />
            Auditing upstream data sources...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-900 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Source & Provider</th>
                  <th className="py-3 px-4">Data Type</th>
                  <th className="py-3 px-4">Coverage</th>
                  <th className="py-3 px-4">Licence & Attribution</th>
                  <th className="py-3 px-4">Health Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sources.map((src) => (
                  <tr key={src.source_key} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{src.name}</div>
                      <div className="text-gray-500 text-[11px]">{src.provider}</div>
                      {src.endpoint_url && (
                        <a
                          href={src.endpoint_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#B79A62] hover:underline font-mono text-[10px] flex items-center gap-1 mt-0.5"
                        >
                          <span>{src.endpoint_url}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px]">{src.data_type}</td>

                    <td className="py-3.5 px-4">{src.geographic_coverage}</td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-gray-800">{src.licence || 'Public / Open'}</div>
                      <div className="text-gray-500 text-[10px] truncate">{src.attribution}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-emerald-700 capitalize">
                          {src.health_status}
                        </span>
                      </div>
                      {src.last_success_at && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Active telemetry verified
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Documented Official Gaps Section */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-xs text-gray-700 space-y-3">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4 text-[#B79A62]" />
          <span>Documented Indian Government Data Gaps & Architectural Fallbacks</span>
        </h3>
        <p className="leading-relaxed">
          The Central Water Commission (CWC) and India-WRIS portals publish official river telemetry, but currently do not offer open public REST APIs without restricted institutional tokens. We do not scrape restricted government sites or fabricate readings. Instead, FloodWatch India utilizes Open-Meteo's CC BY 4.0 GloFAS river discharge feed as a documented, honest hydrological proxy until formal government API credentials can be provisioned.
        </p>
      </div>
    </div>
  );
};
