import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStates, getDistricts, searchLocation, getFloodRisk, getRainfall } from '@/lib/api';
import { RiskBadge } from '@/components/RiskBadge';
import { RainfallChart } from '@/components/RainfallChart';
import type { IndianState, District, SearchResult, FloodRiskResponse, RainfallResponse } from '@/types';
import {
  X,
  Search,
  MapPin,
  Navigation,
  Loader2,
  CheckCircle,
  AlertCircle,
  CloudRain,
  ExternalLink,
} from 'lucide-react';

interface CheckAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOnMap?: (lat: number, lon: number, name: string) => void;
}

export const CheckAreaModal: React.FC<CheckAreaModalProps> = ({
  isOpen,
  onClose,
  onSelectOnMap,
}) => {
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [activeLocation, setActiveLocation] = useState<{
    name: string;
    lat: number;
    lon: number;
  } | null>(null);

  // States list
  const { data: states = [] } = useQuery({
    queryKey: ['states'],
    queryFn: () => getStates(),
    enabled: isOpen,
  });

  // Districts for selected state
  const { data: districts = [] } = useQuery({
    queryKey: ['districts', selectedState],
    queryFn: () => getDistricts(selectedState),
    enabled: isOpen && !!selectedState,
  });

  // Query risk and rainfall for active location
  const { data: riskData, isLoading: isLoadingRisk } = useQuery({
    queryKey: ['areaRisk', activeLocation?.lat, activeLocation?.lon],
    queryFn: () => (activeLocation ? getFloodRisk(activeLocation.lat, activeLocation.lon) : null),
    enabled: !!activeLocation,
  });

  const { data: rainfallData, isLoading: isLoadingRain } = useQuery({
    queryKey: ['areaRainfall', activeLocation?.lat, activeLocation?.lon],
    queryFn: () => (activeLocation ? getRainfall(activeLocation.lat, activeLocation.lon, 24) : null),
    enabled: !!activeLocation,
  });

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await searchLocation(searchQuery);
      setSearchResults(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setActiveLocation({
          name: 'My Current Location (GPS)',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      (err) => {
        alert(`Location access denied or unavailable: ${err.message}`);
      }
    );
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedDistrict(code);
    const d = districts.find((it) => it.code === code);
    if (d) {
      setActiveLocation({
        name: d.name,
        lat: d.centroid_lat,
        lon: d.centroid_lon,
      });
    }
  };

  const selectSearchResult = (item: SearchResult) => {
    setActiveLocation({
      name: item.display_name.split(',')[0],
      lat: item.lat,
      lon: item.lon,
    });
    setSearchResults([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="bg-[#101820] text-white p-5 rounded-t-xl flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#B79A62] font-bold">
              Nationwide Location Intelligence
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">Check Flood Conditions in Your Area</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Controls: Search / State Select / Geolocation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. State Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select State / UT</label>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedDistrict('');
                }}
                className="w-full text-xs p-2.5 rounded-md border border-gray-300 bg-white text-gray-900 focus:ring-1 focus:ring-[#B79A62] focus:border-[#B79A62]"
              >
                <option value="">-- All India States --</option>
                {states.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.name} ({st.code})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. District Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select District</label>
              <select
                value={selectedDistrict}
                onChange={handleDistrictChange}
                disabled={!selectedState}
                className="w-full text-xs p-2.5 rounded-md border border-gray-300 bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 focus:ring-1 focus:ring-[#B79A62] focus:border-[#B79A62]"
              >
                <option value="">-- Choose Monitored District --</option>
                {districts.map((dst) => (
                  <option key={dst.code} value={dst.code}>
                    {dst.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Browser Geolocation */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Device Location</label>
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="w-full text-xs font-semibold p-2.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 flex items-center justify-center gap-1.5 transition-colors border border-gray-300"
              >
                <Navigation className="w-3.5 h-3.5 text-[#B79A62]" />
                <span>Use My GPS Location</span>
              </button>
            </div>
          </div>

          {/* Place Search Input */}
          <div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Or search any Indian city, town, or landmark (e.g., Guwahati, Connaught Place, Alappuzha)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-md border border-gray-300 focus:outline-hidden focus:ring-1 focus:ring-[#B79A62] focus:border-[#B79A62]"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 rounded-md bg-[#101820] text-white text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </button>
            </form>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-2 p-2 bg-white rounded-md border border-gray-200 shadow-md max-h-48 overflow-y-auto space-y-1">
                {searchResults.map((r, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectSearchResult(r)}
                    className="w-full text-left p-2 rounded text-xs hover:bg-gray-50 flex items-start gap-2 text-gray-800"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#B79A62] shrink-0 mt-0.5" />
                    <span>{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Location Results Card */}
          {activeLocation ? (
            <div className="space-y-4 pt-2 border-t border-gray-200">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase">
                    <MapPin className="w-3.5 h-3.5 text-[#B79A62]" />
                    <span>Selected Location</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-gray-900 mt-0.5">
                    {activeLocation.name}
                  </h3>
                  <div className="text-xs text-gray-500 font-mono">
                    Lat: {activeLocation.lat.toFixed(4)}, Lon: {activeLocation.lon.toFixed(4)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isLoadingRisk ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin text-[#B79A62]" />
                      <span>Computing risk...</span>
                    </div>
                  ) : riskData ? (
                    <div className="text-right">
                      <div className="text-[11px] text-gray-500 mb-0.5">Estimated Risk</div>
                      <RiskBadge
                        level={riskData.displayed_level}
                        score={riskData.score}
                        size="md"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">Risk data unavailable</span>
                  )}

                  {onSelectOnMap && (
                    <button
                      onClick={() => {
                        onSelectOnMap(activeLocation.lat, activeLocation.lon, activeLocation.name);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded bg-[#B79A62] hover:bg-[#a68953] text-[#101820] text-xs font-bold transition-all"
                    >
                      View on Map
                    </button>
                  )}
                </div>
              </div>

              {/* Rainfall Timeline */}
              {isLoadingRain ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#B79A62] mb-2" />
                  <span>Loading rainfall data from Open-Meteo...</span>
                </div>
              ) : rainfallData && rainfallData.hourly ? (
                <RainfallChart
                  data={rainfallData.hourly}
                  total24h={rainfallData.total_24h_mm}
                  forecast24h={rainfallData.forecast_24h_mm}
                  locationName={activeLocation.name}
                  attribution={rainfallData.attribution}
                />
              ) : (
                <div className="p-4 rounded-lg bg-gray-50 text-xs text-gray-500 text-center">
                  Hourly rainfall points not available for this coordinate.
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-gray-50 border border-dashed border-gray-300 text-center text-xs text-gray-500">
              <MapPin className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              Select a state and district above, or use the search box to check real-time rainfall, river levels, and risk estimates.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
