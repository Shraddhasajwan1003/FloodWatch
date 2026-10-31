import React from 'react';
import { Link } from 'react-router-dom';
import { Waves, ShieldCheck, Phone, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#101820] text-gray-300 border-t border-gray-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Identity */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2 text-white font-extrabold text-base">
              <div className="w-7 h-7 rounded bg-[#263746] flex items-center justify-center text-[#B79A62]">
                <Waves className="w-4 h-4" />
              </div>
              <span>FloodWatch <span className="text-[#B79A62]">India</span></span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              National flood intelligence and emergency safe-route decision-support platform. Bringing together weather forecasts, river telemetry, and road hazard observations across Indian states.
            </p>
            <div className="text-[11px] text-[#B79A62] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Project 103 • Decision Support Platform</span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">Platform Navigation</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/map" className="hover:text-white transition-colors">Live Flood Map</Link></li>
              <li><Link to="/safe-routes" className="hover:text-white transition-colors">Emergency Route Planner</Link></li>
              <li><Link to="/forecasts" className="hover:text-white transition-colors">24h & 7-Day Outlooks</Link></li>
              <li><Link to="/rivers" className="hover:text-white transition-colors">River Basin Monitoring</Link></li>
              <li><Link to="/reports" className="hover:text-white transition-colors">Report Flood / Waterlogging</Link></li>
              <li><Link to="/facilities" className="hover:text-white transition-colors">Hospitals & Evacuation Shelters</Link></li>
              <li><Link to="/data-sources" className="hover:text-white transition-colors">Data Sources & Integrity</Link></li>
            </ul>
          </div>

          {/* Col 3: Emergency Contacts */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">Official Helplines</h4>
            <ul className="space-y-2 text-gray-400">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-white font-bold">112</span> — National Emergency Response
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-white font-bold">1078</span> — NDMA Disaster Management
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-white font-bold">1070</span> — State Emergency Operations
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-white font-bold">1077</span> — District Disaster Control
              </li>
            </ul>
          </div>

          {/* Col 4: Data & Attribution */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">Data Attribution</h4>
            <p className="text-gray-400 text-xs leading-relaxed mb-3">
              Weather and precipitation: <strong>Open-Meteo.com</strong> (CC BY 4.0).
              River discharge: <strong>GloFAS / Copernicus CEMS</strong>.
              Map geodata: <strong>© OpenStreetMap contributors</strong> under ODbL.
              Routing: <strong>Project OSRM</strong>.
            </p>
            <p className="text-[11px] text-gray-500 italic">
              All displayed values carry explicit provenance and freshness timestamps. Missing datasets are reported explicitly as gaps.
            </p>
          </div>
        </div>

        {/* Bottom Disclaimer bar */}
        <div className="pt-6 border-t border-gray-800 text-[11px] text-gray-500 flex flex-wrap items-center justify-between gap-4">
          <p>
            © {new Date().getFullYear()} FloodWatch India. Built as a civic decision-support platform. Not an official replacement for statutory government warnings or emergency response authorities.
          </p>
          <div className="flex items-center gap-4 text-gray-400">
            <span>Privacy-aware Geolocation</span>
            <span>•</span>
            <span>Zero Tracking</span>
            <span>•</span>
            <span>Open Access</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
