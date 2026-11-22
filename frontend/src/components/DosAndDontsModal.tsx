import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDosAndDonts } from '@/lib/api';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Waves,
  Zap,
  Wind,
  Activity,
  Flame,
  PhoneCall,
  Info,
} from 'lucide-react';

interface DosAndDontsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultHazard?: string;
}

export const DosAndDontsModal: React.FC<DosAndDontsModalProps> = ({
  isOpen,
  onClose,
  defaultHazard = 'flood',
}) => {
  const [activeHazard, setActiveHazard] = useState<string>(defaultHazard);

  const { data: dndData = {} } = useQuery({
    queryKey: ['dosAndDontsRegistry'],
    queryFn: () => getDosAndDonts(),
  });

  if (!isOpen) return null;

  const hazards = [
    { key: 'flood', label: '🌊 Floods & Waterlogging', icon: Waves, color: 'text-blue-600' },
    { key: 'thunderstorm', label: '⚡ Thunderstorm & Lightning', icon: Zap, color: 'text-amber-500' },
    { key: 'cyclone', label: '🌀 Cyclones & High Swells', icon: Wind, color: 'text-cyan-600' },
    { key: 'earthquake', label: '🏚️ Earthquake & Tremors', icon: Activity, color: 'text-emerald-600' },
    { key: 'fire', label: '🔥 Fire & Electrical Hazards', icon: Flame, color: 'text-red-600' },
  ];

  const currentInfo = dndData[activeHazard] || {
    title: 'Disaster Safety Guidelines',
    dos: [
      'Move to higher floors or designated emergency evacuation centers.',
      'Keep emergency battery torches, bottled drinking water, and ORS packets ready.',
      'Follow official advisories broadcasted by NDMA and District Disaster Authorities.',
    ],
    donts: [
      'DO NOT walk or drive across flooded roads or submerged underpasses.',
      'DO NOT enter basements where water is rapidly entering.',
      'DO NOT touch submerged transformers or hanging electric cables.',
    ],
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#B79A62]">
              National Disaster Management Authority (NDMA)
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-0.5 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span>Official Multi-Hazard Safety Dos and Don'ts</span>
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg">
            ✕
          </button>
        </div>

        {/* Hazard Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {hazards.map((h) => (
            <button
              key={h.key}
              onClick={() => setActiveHazard(h.key)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeHazard === h.key
                  ? 'bg-[#101820] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{h.label}</span>
            </button>
          ))}
        </div>

        {/* Actionable Dos & Don'ts Checklist */}
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-2">
            <h3 className="font-extrabold text-emerald-900 text-sm flex items-center gap-1.5 uppercase tracking-wide">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>WHAT YOU MUST DO (DOs)</span>
            </h3>
            <ul className="space-y-1.5 text-gray-800">
              {currentInfo.dos.map((item: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-red-50/80 border border-red-200 space-y-2">
            <h3 className="font-extrabold text-red-900 text-sm flex items-center gap-1.5 uppercase tracking-wide">
              <XCircle className="w-4 h-4 text-red-600" />
              <span>WHAT YOU MUST AVOID (DON'Ts)</span>
            </h3>
            <ul className="space-y-1.5 text-gray-800">
              {currentInfo.donts.map((item: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="w-4 h-4 rounded-full bg-red-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    ✕
                  </span>
                  <span className="font-medium text-red-950">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Emergency Quick-Dial Footer */}
        <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-500">
            <Info className="w-4 h-4 text-blue-600" />
            <span>In immediate danger? Call National Emergency Command:</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="tel:112"
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1 font-mono"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>112</span>
            </a>
            <a
              href="tel:1078"
              className="px-3 py-1.5 rounded-lg bg-[#101820] hover:bg-gray-800 text-white font-bold flex items-center gap-1 font-mono"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>NDMA 1078</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
