import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Globe, Phone, ShieldCheck, Type } from 'lucide-react';

interface UtilityBarProps {
  onOpenDataSources?: () => void;
}

export const UtilityBar: React.FC<UtilityBarProps> = ({ onOpenDataSources }) => {
  const { t, i18n } = useTranslation();
  const [timeStr, setTimeStr] = useState<string>('');
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) + ' IST'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'hi' ? 'en' : 'hi';
    i18n.changeLanguage(nextLang);
  };

  const toggleFontSize = () => {
    if (fontSize === 'normal') {
      document.documentElement.style.fontSize = '18px';
      setFontSize('large');
    } else {
      document.documentElement.style.fontSize = '16px';
      setFontSize('normal');
    }
  };

  return (
    <aside aria-label="Emergency and Accessibility Utility Strip" className="bg-[#101820] text-gray-200 text-xs border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Emergency hotlines & notice */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t('utilityBar.emergency', 'Emergency Hotline: 112')}</span>
          </div>
          <span className="hidden sm:inline text-gray-500">|</span>
          <div className="hidden sm:flex items-center gap-1 text-gray-300">
            <Phone className="w-3 h-3 text-gray-400" />
            <span>NDMA Helpline: 1078 / 1070</span>
          </div>
          <span className="hidden md:inline text-gray-500">|</span>
          <div className="hidden md:flex items-center gap-1 text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Official Decision Support Platform</span>
          </div>
        </div>

        {/* Right: Time, Language, Accessibility, Data Sources */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-gray-300 hidden lg:inline">{timeStr}</span>
          
          <button
            onClick={toggleFontSize}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
            title="Toggle Accessibility Font Size"
            aria-label="Toggle text size"
          >
            <Type className="w-3 h-3" />
            <span>{fontSize === 'normal' ? 'A+' : 'A-'}</span>
          </button>

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#263746] hover:bg-[#344b5f] text-amber-200 font-medium transition-colors"
            title="Change Language"
            aria-label="Select Language"
          >
            <Globe className="w-3 h-3" />
            <span>{i18n.language === 'hi' ? 'English' : 'हिन्दी'}</span>
          </button>

          {onOpenDataSources && (
            <button
              onClick={onOpenDataSources}
              className="text-gray-400 hover:text-white underline hidden sm:inline"
            >
              {t('utilityBar.dataSources', 'Data Sources')}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
