import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Map, Compass, Search, ShieldCheck, Info } from 'lucide-react';

interface HeroProps {
  onCheckArea: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onCheckArea }) => {
  const { t } = useTranslation();

  return (
    <section className="relative bg-[#101820] text-white overflow-hidden border-b border-gray-800">
      {/* Subtle topographic civic grid background */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#B79A62_1px,transparent_1px)] [background-size:24px_24px]"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 lg:pt-20 lg:pb-24">
        <div className="max-w-3xl">
          {/* Civic Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#263746] border border-gray-700 text-amber-200 text-xs font-semibold uppercase tracking-wider mb-6">
            <ShieldCheck className="w-3.5 h-3.5 text-[#B79A62]" />
            <span>National Flood Intelligence & Safety Decision Support</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight sm:leading-none mb-6">
            Know the Risk. <br />
            <span className="text-[#B79A62]">Plan a Safer Route.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-gray-300 leading-relaxed mb-8 max-w-2xl">
            {t(
              'hero.subtext',
              'FloodWatch India combines weather forecasts, river telemetry, explainable terrain risk, and community-reported road hazards to help citizens and emergency teams make informed decisions during monsoon and flood events.'
            )}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/map"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-md bg-[#B79A62] hover:bg-[#a68953] text-[#101820] text-sm font-bold tracking-wide uppercase shadow-md transition-all active:scale-98"
            >
              <Map className="w-4 h-4 text-[#101820]" />
              <span>{t('hero.cta.map', 'Explore Live Flood Map')}</span>
            </Link>

            <button
              onClick={onCheckArea}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-md bg-white hover:bg-gray-100 text-[#101820] text-sm font-bold tracking-wide uppercase shadow-md transition-all active:scale-98"
            >
              <Search className="w-4 h-4 text-[#101820]" />
              <span>{t('hero.cta.area', 'Check My Area')}</span>
            </button>

            <Link
              to="/safe-routes"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-md bg-[#263746] hover:bg-[#344b5f] text-white border border-gray-700 text-sm font-semibold tracking-wide transition-all"
            >
              <Compass className="w-4 h-4 text-amber-300" />
              <span>{t('hero.cta.routes', 'Plan a Safer Route')}</span>
            </Link>
          </div>

          {/* Safety Disclaimer Banner */}
          <div className="mt-8 flex items-start gap-2.5 p-3 rounded-md bg-[#192532] border border-gray-700 text-xs text-gray-300 max-w-2xl">
            <Info className="w-4 h-4 text-[#B79A62] shrink-0 mt-0.5" />
            <p>
              <strong className="text-white">Decision Support Disclaimer:</strong> Real-time river levels are monitored from supported telemetry stations. Weather forecasts are derived from Open-Meteo. This portal assists situational awareness and does not replace official evacuation orders from NDMA or district collectors.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
