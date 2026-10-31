import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getNearbyFacilities } from '@/lib/api';
import type { Facility, FacilityType } from '@/types';
import {
  Hospital,
  Shield,
  Phone,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2,
  Navigation,
} from 'lucide-react';

export const FacilitiesPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number }>({
    lat: 28.6139,
    lon: 77.2090, // Delhi center default
  });

  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ['facilitiesPage', userCoords.lat, userCoords.lon, selectedType],
    queryFn: () =>
      getNearbyFacilities(
        userCoords.lat,
        userCoords.lon,
        150,
        selectedType !== 'all' ? (selectedType as FacilityType) : undefined
      ),
  });

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => alert('Location permission denied.')
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-red-600">
            Emergency Infrastructure
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1 flex items-center gap-2">
            <Hospital className="w-7 h-7 text-red-600" />
            <span>Hospitals & Designated Evacuation Shelters</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 max-w-2xl mt-1">
            Authoritative directory of government medical emergency trauma wards, designated disaster shelters, and flood relief centers.
          </p>
        </div>

        <button
          onClick={handleUseMyLocation}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#101820] hover:bg-gray-800 text-white text-xs font-bold transition-all shadow-xs"
        >
          <Navigation className="w-3.5 h-3.5 text-[#B79A62]" />
          <span>Sort by Distance from GPS</span>
        </button>
      </div>

      {/* Operational Capacity Disclaimer */}
      <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Facility Preparedness Caveat:</strong> Facility operational capacity and bed occupancy can change rapidly during inundation. The platform shows officially mapped structures and verified contact phone lines. Always verify facility accessibility before navigating.
        </div>
      </div>

      {/* Facility Type Filter */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 text-xs overflow-x-auto">
        <span className="font-semibold text-gray-500 mr-2 shrink-0">Facility Type:</span>
        {[
          { key: 'all', label: 'All Facilities' },
          { key: 'hospital', label: 'Hospitals & Trauma Centers' },
          { key: 'shelter', label: 'Designated Shelters' },
          { key: 'relief_camp', label: 'Relief Camps' },
        ].map((it) => (
          <button
            key={it.key}
            onClick={() => setSelectedType(it.key)}
            className={`px-3 py-1 rounded-full font-semibold shrink-0 transition-colors ${
              selectedType === it.key
                ? 'bg-[#101820] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>

      {/* Facilities Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-gray-500 bg-white rounded-xl border border-gray-200">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-red-600 mb-2" />
          Loading mapped facilities...
        </div>
      ) : facilities.length === 0 ? (
        <div className="p-16 text-center text-xs text-gray-500 bg-white rounded-xl border border-gray-200">
          No facilities found within the selected radius.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {facilities.map((fac) => (
            <div
              key={fac.id}
              className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-red-100 text-red-800">
                    {fac.facility_type.replace('_', ' ')}
                  </span>
                  {fac.is_verified && (
                    <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-gray-900 leading-snug">{fac.name}</h3>
                <p className="text-xs text-gray-600 mt-1">{fac.address || 'Address on record'}</p>

                {fac.phone && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-800 font-semibold">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Phone: {fac.phone}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <span className="font-semibold text-gray-700">Source: {fac.source}</span>
                {fac.distance_km !== undefined && (
                  <span className="text-[#B79A62] font-bold">~{fac.distance_km} km away</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
