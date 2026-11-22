import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAlerts, getNearbyReports } from '@/lib/api';
import type { OfficialAlert, CommunityReport } from '@/types';
import { AlertTriangle, Volume2, VolumeX, ShieldAlert, ChevronRight, RefreshCw, X } from 'lucide-react';

// Web Audio API synthesizes a disaster advisory alert chime
function playEmergencyChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.log('Audio chime not permitted by browser autoplay policy:', e);
  }
}

export const LiveAlertTicker: React.FC = () => {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Live Alerts
  const { data: alerts = [], refetch: refetchAlerts } = useQuery({
    queryKey: ['liveAlertsTicker'],
    queryFn: () => getAlerts(),
    refetchInterval: 30000,
  });

  // Recent road blockages
  const { data: reports = [], refetch: refetchReports } = useQuery({
    queryKey: ['liveReportsTicker'],
    queryFn: () => getNearbyReports(26.1445, 91.7362, 50),
    refetchInterval: 30000,
  });

  const roadBlocks = reports.filter((r) => r.road_blocked || r.category === 'road_blocked' || r.category === 'waterlogging');

  // Combined ticker items
  const items: Array<{
    type: 'official_alert' | 'road_block';
    title: string;
    detail: string;
    severity: string;
  }> = [];

  alerts.forEach((a) => {
    items.push({
      type: 'official_alert',
      title: a.headline || (a as any).title || 'Official Flood Advisory',
      detail: a.description || a.area_description || 'IMD / NDMA statutory flood warning issued.',
      severity: a.severity || 'warning',
    });
  });

  roadBlocks.forEach((r) => {
    items.push({
      type: 'road_block',
      title: `Road Waterlogging Reported (${r.category.replace('_', ' ')})`,
      detail: `${r.description}${r.water_depth_cm ? ` • Water depth ~${r.water_depth_cm}cm` : ''}`,
      severity: r.road_blocked ? 'severe' : 'warning',
    });
  });

  // Cycle ticker items
  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % items.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [items.length]);

  const handleToggleAudio = () => {
    const nextState = !audioEnabled;
    setAudioEnabled(nextState);
    if (nextState) {
      playEmergencyChime();
    }
  };

  const handleRefresh = () => {
    refetchAlerts();
    refetchReports();
  };

  if (dismissed || items.length === 0) {
    return null;
  }

  const currentItem = items[tickerIndex % items.length];

  const getSeverityBadge = (sev: string) => {
    if (sev === 'extreme') return 'bg-red-700 text-white';
    if (sev === 'severe') return 'bg-red-600 text-white';
    return 'bg-amber-600 text-white';
  };

  return (
    <aside
      role="region"
      aria-label="Disaster Alerts Ticker"
      className="bg-[#101820] text-white border-b border-gray-800 text-xs px-4 py-2 transition-all shadow-md z-[100]"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Ticker Label & Content */}
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span className="font-mono font-bold text-[10px] uppercase tracking-wider text-red-400">
              LIVE DISASTER ALERTS ({items.length})
            </span>
          </div>

          <div className="hidden sm:inline-block h-3.5 w-px bg-gray-700"></div>

          <div className="flex items-center gap-2 truncate">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${getSeverityBadge(currentItem.severity)}`}>
              {currentItem.severity}
            </span>
            <span className="font-semibold text-gray-100 truncate">
              {currentItem.title}:
            </span>
            <span className="text-gray-300 text-[11px] truncate hidden md:inline">
              {currentItem.detail}
            </span>
          </div>
        </div>

        {/* Right: Controls (Audio, Refresh, Dismiss) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleToggleAudio}
            className={`p-1.5 rounded hover:bg-gray-800 transition-colors flex items-center gap-1 text-[11px] ${
              audioEnabled ? 'text-[#B79A62]' : 'text-gray-400'
            }`}
            title={audioEnabled ? 'Audio alerts active' : 'Enable audio chime for alerts'}
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">{audioEnabled ? 'Alert Audio ON' : 'Muted'}</span>
          </button>

          <button
            onClick={handleRefresh}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Refresh alert feed"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
            title="Dismiss ticker for this session"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
