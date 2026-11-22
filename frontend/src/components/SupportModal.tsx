import React, { useState } from 'react';
import {
  LifeBuoy,
  PhoneCall,
  ShieldAlert,
  HeartPulse,
  Flame,
  Activity,
  Car,
  Home,
  Zap,
  Droplet,
  ExternalLink,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'emergency' | 'firstaid' | 'technical'>('emergency');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#B79A62]">
              Civic Disaster Assistance
            </div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-0.5">
              <LifeBuoy className="w-5 h-5 text-red-600" />
              <span>Emergency First Response & Technical Support</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 text-xs">
          <button
            onClick={() => setActiveTab('emergency')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'emergency'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Emergency Helplines</span>
          </button>

          <button
            onClick={() => setActiveTab('firstaid')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'firstaid'
                ? 'bg-[#101820] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Flood Survival & First-Aid</span>
          </button>

          <button
            onClick={() => setActiveTab('technical')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'technical'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Platform Technical Help</span>
          </button>
        </div>

        {/* Tab 1: Emergency Helplines */}
        {activeTab === 'emergency' && (
          <div className="space-y-4 text-xs">
            <p className="text-gray-600">
              Verified national and state disaster control room numbers. Direct dial available on mobile devices:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'National Emergency Helpline', number: '112', desc: 'Police, Fire, Ambulance 24x7 all-India' },
                { name: 'NDMA Disaster Management', number: '1078', desc: 'National Disaster Management Authority control room' },
                { name: 'State Disaster Control Room', number: '1070', desc: 'State emergency operation centre' },
                { name: 'District Emergency Helpline', number: '1077', desc: 'District Magistrate disaster relief unit' },
                { name: 'Ambulance Emergency', number: '108', desc: 'Medical trauma and emergency transport' },
                { name: 'Fire & Rescue Service', number: '101', desc: 'Flood water rescue and boat dispatch' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-white transition-all space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{item.name}</span>
                    <a
                      href={`tel:${item.number}`}
                      className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-mono font-bold flex items-center gap-1"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>{item.number}</span>
                    </a>
                  </div>
                  <p className="text-gray-500 text-[11px]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Flood Survival & First-Aid */}
        {activeTab === 'firstaid' && (
          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 space-y-1.5">
              <div className="font-bold text-amber-900 flex items-center gap-2">
                <Car className="w-4 h-4 text-amber-700" />
                <span>Vehicle Submersion Emergency Protocol</span>
              </div>
              <p className="text-gray-700 text-[11px] leading-relaxed">
                If vehicle is trapped in rising waters: <strong>Unbuckle immediately, roll down windows before power fails</strong>. If windows fail to open, pull out headrest and use metal prongs to strike corner of side glass. Never stay inside a floating car.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/60 space-y-1.5">
              <div className="font-bold text-red-900 flex items-center gap-2">
                <Home className="w-4 h-4 text-red-700" />
                <span>Basement & Underpass Rapid Inundation (Delhi Safety Directive)</span>
              </div>
              <p className="text-gray-700 text-[11px] leading-relaxed">
                Water entering basements can seal doors shut due to external hydrostatic pressure. <strong>Evacuate vertically to upper floors at the first sign of water ingress</strong>. Never enter an underpass when water depth is unknown or exceeds curb height.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-yellow-200 bg-yellow-50/60 space-y-1.5">
              <div className="font-bold text-yellow-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-700" />
                <span>Electrocution Prevention</span>
              </div>
              <p className="text-gray-700 text-[11px] leading-relaxed">
                Treat all submerged wires as live. Maintain at least <strong>10 meters (33 ft) distance</strong> from fallen power cables and flooded electric transformers. Switch off the main electrical MCB if water reaches ground floor.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 space-y-1.5">
              <div className="font-bold text-blue-900 flex items-center gap-2">
                <Droplet className="w-4 h-4 text-blue-700" />
                <span>Emergency Water Purification & ORS Hydration</span>
              </div>
              <p className="text-gray-700 text-[11px] leading-relaxed">
                To prevent cholera and leptospirosis: Boil water at a rolling boil for 1 full minute or add 1 chlorine/halazone tablet per 20 liters. For diarrhea, administer 1 packet of Oral Rehydration Salts (ORS) dissolved in 1 liter of safe drinking water.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Technical Platform Help */}
        {activeTab === 'technical' && (
          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 space-y-1.5">
              <h4 className="font-bold text-gray-900">How Does Offline Mode Work?</h4>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                JalDrishti India includes offline caching. When cell network is lost, any distress SOS or road blockage report you submit is securely stored in your device's browser memory. As soon as connectivity returns, it automatically syncs with national emergency servers.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 space-y-1.5">
              <h4 className="font-bold text-gray-900">AI Forgery & False Alarm Detection</h4>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                To ensure life-saving rescue boats are not diverted by malicious or prank submissions, the AI triage layer cross-references reported water depths against Open-Meteo precipitation models, CWC river levels, and nearby citizen report density.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 space-y-1.5">
              <h4 className="font-bold text-gray-900">Platform Technical Assistance</h4>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                For technical issues, API integrations, or contributing hydrological sensors, contact the developer desk at <code className="bg-gray-200 px-1 rounded">tech-support@jaldrishti.gov.in</code>.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#101820] hover:bg-gray-800 text-white text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
