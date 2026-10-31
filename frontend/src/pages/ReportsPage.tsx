import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getNearbyReports } from '@/lib/api';
import { ReportModal } from '@/components/ReportModal';
import { formatRelativeTime } from '@/lib/risk';
import type { CommunityReport } from '@/types';
import {
  AlertTriangle,
  Plus,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['allCommunityReports'],
    queryFn: () => getNearbyReports(20.5937, 78.9629, 2500),
  });

  const filteredReports = reports.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status.toLowerCase() === filterStatus.toLowerCase();
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified':
        return (
          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>VERIFIED</span>
          </span>
        );
      case 'corroborated':
        return (
          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
            CORROBORATED
          </span>
        );
      case 'unverified':
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-amber-600" />
            <span>UNVERIFIED</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-orange-600">
            Citizen Sourced Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1 flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-orange-600" />
            <span>Community Waterlogging & Road Incident Reports</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 max-w-2xl mt-1">
            Reports submitted by motorists, citizens, and emergency volunteers. Helps identify street inundation hotspots ahead of official updates.
          </p>
        </div>

        <button
          onClick={() => setIsSubmitOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#B79A62] hover:bg-[#a68953] text-[#101820] text-xs font-bold uppercase tracking-wider shadow-sm transition-all active:scale-98"
        >
          <Plus className="w-4 h-4 text-[#101820]" />
          <span>Report New Hazard</span>
        </button>
      </div>

      {/* Moderation Policy Notice */}
      <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-900 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Crowdsourced Quality Policy:</strong> All submissions enter as <strong>UNVERIFIED</strong> to protect scoring integrity. Reports are corroborated when multiple distinct reports arrive from the same geographic cluster, or confirmed by district authorities. Expired incidents leave the active map after 3 hours.
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 text-xs">
        <span className="font-semibold text-gray-500 mr-2">Filter Status:</span>
        {['all', 'unverified', 'verified', 'corroborated'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1 rounded-full font-semibold capitalize transition-colors ${
              filterStatus === st
                ? 'bg-[#101820] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Reports Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-gray-500 bg-white rounded-xl border border-gray-200">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#B79A62] mb-2" />
          Loading community incident feeds...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="p-16 text-center text-xs text-gray-500 bg-white rounded-xl border border-gray-200 space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-gray-800">No active incidents match this filter</h3>
          <p className="text-gray-400">
            If you encounter flooded streets or impassable underpasses, click "Report New Hazard".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReports.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                    {r.category.replace('_', ' ')}
                  </span>
                  {getStatusBadge(r.status)}
                </div>

                <p className="text-xs text-gray-800 font-medium leading-relaxed mb-3">
                  {r.description}
                </p>

                {r.road_blocked && (
                  <div className="mb-2 px-2.5 py-1 rounded bg-red-100 text-red-900 font-extrabold text-[11px] inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                    <span>ROADWAY IMPASSABLE</span>
                  </div>
                )}

                {r.water_depth_cm && (
                  <div className="text-xs text-gray-600">
                    Reported Depth: <strong className="text-gray-900">~{r.water_depth_cm} cm</strong>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatRelativeTime(r.submitted_at)}</span>
                </span>
                <span className="font-mono">
                  {r.lat.toFixed(3)}°N, {r.lon.toFixed(3)}°E
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit Report Modal */}
      <ReportModal isOpen={isSubmitOpen} onClose={() => setIsSubmitOpen(false)} />
    </div>
  );
};
