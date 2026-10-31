import React from 'react';
import { useTranslation } from 'react-i18next';
import { RISK_DISPLAY } from '@/lib/risk';
import type { RiskLevel } from '@/types';
import { ShieldCheck, AlertCircle, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';

interface RiskBadgeProps {
  level: RiskLevel | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  score?: number | null;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  size = 'md',
  showIcon = true,
  score,
  className = '',
}) => {
  const { i18n } = useTranslation();
  const safeLevel = (level?.toLowerCase() in RISK_DISPLAY ? level.toLowerCase() : 'unknown') as RiskLevel;
  const config = RISK_DISPLAY[safeLevel];

  const getIcon = () => {
    switch (safeLevel) {
      case 'green':
        return <ShieldCheck className="w-3.5 h-3.5" />;
      case 'yellow':
        return <AlertCircle className="w-3.5 h-3.5 text-yellow-900" />;
      case 'orange':
        return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'red':
        return <AlertOctagon className="w-3.5 h-3.5 animate-pulse" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5" />;
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-semibold px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-bold px-3 py-1.5 gap-2',
  };

  const label = i18n.language === 'hi' ? config.label_hi : config.label;

  return (
    <span
      role="status"
      aria-label={config.ariaLabel}
      className={`inline-flex items-center rounded-full shadow-xs ${config.bgClass} ${config.textClass} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && getIcon()}
      <span>{label}</span>
      {score !== undefined && score !== null && (
        <span className="opacity-90 font-mono text-[11px] ml-0.5">({score}/100)</span>
      )}
    </span>
  );
};
