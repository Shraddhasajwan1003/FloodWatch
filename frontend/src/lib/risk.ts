/**
 * FloodWatch India — Risk level utilities.
 * Centralised colour, label, icon and aria-label mapping for risk levels.
 * Colour is NEVER the only means of communicating danger — each level
 * also has a text label and icon.
 */
import type { RiskLevel, DataQuality } from '@/types';

export interface RiskDisplay {
  level: RiskLevel;
  label: string;         // English label
  label_hi: string;      // Hindi label
  icon: string;          // Emoji icon
  bgClass: string;       // Tailwind background class
  textClass: string;     // Text colour
  borderClass: string;   // Border colour
  hex: string;           // For Leaflet markers
  ariaLabel: string;     // Screen reader label
  description: string;   // Short explanation for users
}

export const RISK_DISPLAY: Record<RiskLevel, RiskDisplay> = {
  green: {
    level: 'green',
    label: 'Below Warning',
    label_hi: 'चेतावनी से नीचे',
    icon: '🟢',
    bgClass: 'bg-green-600',
    textClass: 'text-white',
    borderClass: 'border-green-600',
    hex: '#16A34A',
    ariaLabel: 'Green: Below flood warning threshold',
    description: 'Conditions are within normal range. Continue to monitor updates.',
  },
  yellow: {
    level: 'yellow',
    label: 'Watch',
    label_hi: 'सतर्कता',
    icon: '🟡',
    bgClass: 'bg-yellow-400',
    textClass: 'text-gray-900',
    borderClass: 'border-yellow-400',
    hex: '#EAB308',
    ariaLabel: 'Yellow: Flood watch — elevated conditions',
    description: 'Conditions are elevated. Stay alert and monitor updates closely.',
  },
  orange: {
    level: 'orange',
    label: 'High Risk',
    label_hi: 'उच्च जोखिम',
    icon: '🟠',
    bgClass: 'bg-orange-500',
    textClass: 'text-white',
    borderClass: 'border-orange-500',
    hex: '#F97316',
    ariaLabel: 'Orange: High flood risk',
    description: 'High flood risk. Avoid low-lying areas and underpasses.',
  },
  red: {
    level: 'red',
    label: 'Severe Risk',
    label_hi: 'गंभीर जोखिम',
    icon: '🔴',
    bgClass: 'bg-red-600',
    textClass: 'text-white',
    borderClass: 'border-red-600',
    hex: '#DC2626',
    ariaLabel: 'Red: Severe flood risk',
    description: 'Severe flood risk. Follow official evacuation orders. Avoid all flood-affected areas.',
  },
  unknown: {
    level: 'unknown',
    label: 'Data Unavailable',
    label_hi: 'डेटा अनुपलब्ध',
    icon: '⚪',
    bgClass: 'bg-gray-400',
    textClass: 'text-white',
    borderClass: 'border-gray-400',
    hex: '#667085',
    ariaLabel: 'Unknown: Insufficient data to assess flood risk',
    description: 'Insufficient data to assess risk. Check official sources.',
  },
};

export const QUALITY_DISPLAY: Record<DataQuality, { label: string; className: string }> = {
  live: { label: 'LIVE', className: 'bg-green-100 text-green-800' },
  stale: { label: 'STALE', className: 'bg-yellow-100 text-yellow-800' },
  unavailable: { label: 'UNAVAILABLE', className: 'bg-gray-100 text-gray-600' },
  estimated: { label: 'ESTIMATED', className: 'bg-blue-100 text-blue-800' },
  simulated: { label: 'SIMULATED (TEST)', className: 'bg-purple-100 text-purple-800' },
};

export function formatRelativeTime(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString);
  const diffMinutes = Math.floor((now.getTime() - then.getTime()) / 60000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
}

export function isStale(isoString: string, staleMinutes: number): boolean {
  const diffMinutes = (Date.now() - new Date(isoString).getTime()) / 60000;
  return diffMinutes > staleMinutes;
}
