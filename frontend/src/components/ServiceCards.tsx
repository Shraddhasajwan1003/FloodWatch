import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Activity,
  CloudRain,
  Compass,
  AlertTriangle,
  Hospital,
  ArrowRight,
} from 'lucide-react';

interface ServiceCardsProps {
  onCheckArea: () => void;
  onOpenReport: () => void;
}

export const ServiceCards: React.FC<ServiceCardsProps> = ({ onCheckArea, onOpenReport }) => {
  const cards = [
    {
      title: 'Check Local Flood Risk',
      description: 'Search any district or pin your location to view explainable 4-level risk scores and contributing factors.',
      icon: ShieldAlert,
      action: onCheckArea,
      actionText: 'Check Risk',
      accentColor: 'border-l-4 border-l-emerald-600',
    },
    {
      title: 'View River Telemetry',
      description: 'Monitor river discharge estimates and trends along major basins including Brahmaputra, Yamuna, and Ganga.',
      icon: Activity,
      to: '/rivers',
      actionText: 'View Stations',
      accentColor: 'border-l-4 border-l-blue-600',
    },
    {
      title: 'Explore Forecasts',
      description: '24-hour hourly outlooks and 7-day meteorological forecasts with distinct hydrological flood risk separation.',
      icon: CloudRain,
      to: '/forecasts',
      actionText: 'View Outlook',
      accentColor: 'border-l-4 border-l-amber-500',
    },
    {
      title: 'Find a Safer Route',
      description: 'Emergency routing that accounts for verified road closures, underpasses, and reported waterlogged intersections.',
      icon: Compass,
      to: '/safe-routes',
      actionText: 'Plan Route',
      accentColor: 'border-l-4 border-l-[#B79A62]',
    },
    {
      title: 'Report Waterlogging',
      description: 'Submit verified local road blockages, submerged underpasses, or drainage overflows to alert emergency responders.',
      icon: AlertTriangle,
      action: onOpenReport,
      actionText: 'Submit Report',
      accentColor: 'border-l-4 border-l-orange-500',
    },
    {
      title: 'Nearby Hospitals & Shelters',
      description: 'Locate officially mapped medical trauma centers and designated disaster relief shelters with driving distance.',
      icon: Hospital,
      to: '/facilities',
      actionText: 'Find Facilities',
      accentColor: 'border-l-4 border-l-red-600',
    },
  ];

  return (
    <section className="relative -mt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20 mb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          const content = (
            <div className={`bg-white rounded-lg p-5 shadow-sm hover:shadow-md border border-gray-200 transition-all ${card.accentColor} flex flex-col justify-between h-full group`}>
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 group-hover:text-[#101820] transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-[#B79A62] transition-colors">
                    {card.title}
                  </h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  {card.description}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-[#101820] group-hover:text-[#B79A62] transition-colors">
                <span>{card.actionText}</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );

          if (card.to) {
            return (
              <Link key={idx} to={card.to} className="block focus:outline-hidden">
                {content}
              </Link>
            );
          }

          return (
            <button key={idx} onClick={card.action} className="w-full text-left focus:outline-hidden">
              {content}
            </button>
          );
        })}
      </div>
    </section>
  );
};
