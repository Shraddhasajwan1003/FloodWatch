import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
} from 'react-leaflet';
import L from 'leaflet';
import {
  getRescueRequests,
  getRescueStatistics,
  submitRescueRequest,
  updateRescueStatus,
} from '@/lib/api';
import type { RescueRequest, RescueStatus } from '@/types';
import {
  LifeBuoy,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  ShieldAlert,
  Bot,
  Activity,
  HeartPulse,
  Baby,
  RefreshCw,
  Search,
  Filter,
  PlusCircle,
  Navigation,
} from 'lucide-react';

const createRescueIcon = (status: RescueStatus, stage: string) => {
  let color = '#DC2626'; // needs rescue
  let label = 'SOS';
  if (status === 'in_progress') {
    color = '#EA580C';
    label = '⏳';
  } else if (status === 'rescued' || status === 'safe') {
    color = '#16A34A';
    label = '✓';
  }

  const isRooftop = stage === 'rooftop' || stage === 'chest';
  const animation = status === 'needs_rescue' && isRooftop ? 'animation: pulse 1.5s infinite;' : '';

  return L.divIcon({
    className: 'custom-rescue-marker',
    html: `
      <div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; ${animation}">
        ${label}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

export const RescueTrackerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RescueRequest | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    contact_name: '',
    phone: '',
    lat: 26.1445,
    lon: 91.7362,
    address_landmark: '',
    people_count: 2,
    has_infants_or_elderly: false,
    medical_emergency_notes: '',
    water_level_stage: 'waist',
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['rescueStats'],
    queryFn: getRescueStatistics,
    refetchInterval: 15000,
  });

  const { data: requests = [], isLoading: requestsLoading, refetch } = useQuery({
    queryKey: ['rescueRequests'],
    queryFn: () => getRescueRequests(),
    refetchInterval: 15000,
  });

  const submitMutation = useMutation({
    mutationFn: submitRescueRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rescueRequests'] });
      queryClient.invalidateQueries({ queryKey: ['rescueStats'] });
      setShowSubmitModal(false);
      setFormData({
        contact_name: '',
        phone: '',
        lat: 26.1445,
        lon: 91.7362,
        address_landmark: '',
        people_count: 2,
        has_infants_or_elderly: false,
        medical_emergency_notes: '',
        water_level_stage: 'waist',
      });
      alert('Rescue SOS registered. Response teams and community volunteers have been notified.');
    },
    onError: (err: any) => {
      alert(`Submission failed: ${err?.response?.data?.detail || err.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status: RescueStatus; rescued_by?: string; rescue_notes?: string } }) =>
      updateRescueStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rescueRequests'] });
      queryClient.invalidateQueries({ queryKey: ['rescueStats'] });
      setSelectedRequest(null);
    },
  });

  const handleUseLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setFormData((prev) => ({
          ...prev,
          lat: Number(pos.coords.latitude.toFixed(5)),
          lon: Number(pos.coords.longitude.toFixed(5)),
        }));
      });
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.contact_name.toLowerCase().includes(q) ||
        r.address_landmark.toLowerCase().includes(q) ||
        r.phone.includes(q)
      );
    }
    return true;
  });

  const pendingCount = stats?.needs_rescue ?? requests.filter((r) => r.status === 'needs_rescue').length;
  const inProgressCount = stats?.in_progress ?? requests.filter((r) => r.status === 'in_progress').length;
  const rescuedCount = (stats?.rescued ?? 0) + (stats?.safe ?? 0) || requests.filter((r) => r.status === 'rescued' || r.status === 'safe').length;
  const totalPeopleRescued = stats?.people_rescued ?? requests.filter((r) => r.status === 'rescued').reduce((acc, r) => acc + r.people_count, 0);
  const totalPeopleAwaiting = stats?.people_awaiting_rescue ?? requests.filter((r) => r.status === 'needs_rescue').reduce((acc, r) => acc + r.people_count, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title & Mission */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#B79A62]">
            Community Disaster Coordination
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1 flex items-center gap-2">
            <LifeBuoy className="w-7 h-7 text-[#DC2626]" />
            <span>Community Rescue & Rescued-Status Tracker</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 max-w-2xl mt-1">
            Real-time citizen SOS register. Monitors who is stranded, who has been evacuated, and dispatches community volunteers and rescue teams with AI verification to prevent fake distress calls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh Live Data"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2.5 rounded-lg bg-[#DC2626] hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post Distress SOS</span>
          </button>
        </div>
      </div>

      {/* Real-time Rescue Status Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50/70 border border-red-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">Awaiting Rescue</span>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-red-900">{pendingCount}</span>
            <span className="text-xs text-red-600 font-medium">locations ({totalPeopleAwaiting} people)</span>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">In Progress</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-900">{inProgressCount}</span>
            <span className="text-xs text-amber-600 font-medium">teams dispatched</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Successfully Rescued</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-900">{rescuedCount}</span>
            <span className="text-xs text-emerald-600 font-medium">sites safe</span>
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Evacuated Citizens</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-900">{totalPeopleRescued}</span>
            <span className="text-xs text-blue-600 font-medium">people saved</span>
          </div>
        </div>
      </div>

      {/* Interactive Map & Rescue List Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Map (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                <span>Geographic Distress Radar</span>
              </span>
              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <span className="flex items-center gap-1 text-red-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> Urgent
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> Dispatched
                </span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Rescued
                </span>
              </div>
            </div>

            <div style={{ height: '480px' }}>
              <MapContainer
                center={[26.1445, 91.7362]}
                zoom={11}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {filteredRequests.map((r) => (
                  <React.Fragment key={r.id}>
                    <Marker
                      position={[r.lat, r.lon]}
                      icon={createRescueIcon(r.status, r.water_level_stage)}
                      eventHandlers={{
                        click: () => setSelectedRequest(r),
                      }}
                    >
                      <Popup>
                        <div className="text-xs p-1 space-y-1.5 max-w-[220px]">
                          <div className="flex items-center justify-between">
                            <strong className="text-gray-900 font-bold">{r.contact_name}</strong>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              r.status === 'needs_rescue' ? 'bg-red-100 text-red-700' :
                              r.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {r.status === 'needs_rescue' ? 'NEEDS RESCUE' : r.status === 'in_progress' ? 'DISPATCHED' : 'RESCUED'}
                            </span>
                          </div>
                          <div className="text-gray-600">{r.address_landmark}</div>
                          <div className="font-semibold text-gray-800">
                            👥 {r.people_count} people {r.has_infants_or_elderly && '• ⚠️ Elderly/Infant'}
                          </div>
                          <div className="text-red-700 font-semibold">
                            🌊 Water Level: <span className="uppercase">{r.water_level_stage}</span>
                          </div>
                          {r.medical_emergency_notes && (
                            <div className="text-red-600 text-[11px] font-semibold bg-red-50 p-1 rounded">
                              🚨 {r.medical_emergency_notes}
                            </div>
                          )}
                          <div className="pt-1 flex items-center justify-between border-t border-gray-100">
                            <span className="text-[10px] text-gray-500 font-mono">AI Trust: {r.ai_trust_score}%</span>
                            <a href={`tel:${r.phone}`} className="text-blue-600 font-bold hover:underline">
                              Call: {r.phone}
                            </a>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                    {r.water_level_stage === 'rooftop' && r.status === 'needs_rescue' && (
                      <Circle
                        center={[r.lat, r.lon]}
                        radius={350}
                        pathOptions={{ color: '#DC2626', fillColor: '#DC2626', fillOpacity: 0.2 }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Right List & Action Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone or landmark..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-300"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', label: 'All Incidents' },
                { id: 'needs_rescue', label: '⚠️ Needs Rescue' },
                { id: 'in_progress', label: '⏳ Dispatched' },
                { id: 'rescued', label: '✓ Rescued' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                    filterStatus === tab.id
                      ? 'bg-[#101820] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Incident Cards */}
          <div className="space-y-3 max-h-[510px] overflow-y-auto pr-1">
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-gray-500 text-xs">
                No rescue incidents matching this filter.
              </div>
            ) : (
              filteredRequests.map((r) => {
                const isSelected = selectedRequest?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRequest(r)}
                    className={`cursor-pointer p-4 rounded-xl border bg-white shadow-xs transition-all space-y-2.5 ${
                      isSelected
                        ? 'border-[#B79A62] ring-2 ring-[#B79A62]/40 bg-amber-50/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                          <span>{r.contact_name}</span>
                          {r.has_infants_or_elderly && (
                            <span className="p-1 rounded bg-amber-100 text-amber-800" title="Infant or Elderly stranded">
                              <Baby className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {r.medical_emergency_notes && (
                            <span className="p-1 rounded bg-red-100 text-red-800" title="Medical Emergency">
                              <HeartPulse className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="line-clamp-1">{r.address_landmark}</span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        r.status === 'needs_rescue'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : r.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}>
                        {r.status === 'needs_rescue' ? 'Needs Help' : r.status === 'in_progress' ? 'Dispatching' : 'Rescued'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 bg-gray-50 p-2 rounded-lg">
                      <div>
                        <span className="text-gray-500 text-[11px]">Party Size:</span>{' '}
                        <strong className="font-bold">{r.people_count} People</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[11px]">Water Level:</span>{' '}
                        <strong className="font-bold uppercase text-red-700">{r.water_level_stage}</strong>
                      </div>
                    </div>

                    {r.medical_emergency_notes && (
                      <div className="text-xs text-red-800 bg-red-50 p-2 rounded-md font-medium border border-red-100">
                        🚨 {r.medical_emergency_notes}
                      </div>
                    )}

                    {/* AI Trust & Forgery Flag Badge */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Bot className="w-3.5 h-3.5 text-blue-600" />
                        <span>AI Trust:</span>
                        <strong className={`font-mono ${r.ai_trust_score >= 80 ? 'text-emerald-700' : r.ai_trust_score >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                          {r.ai_trust_score}%
                        </strong>
                        {r.is_suspicious && (
                          <span className="text-red-600 font-bold ml-1">(Flagged Verification)</span>
                        )}
                      </div>

                      <a
                        href={`tel:${r.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-700 font-bold hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{r.phone}</span>
                      </a>
                    </div>

                    {/* Responder Action Buttons */}
                    <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                      {r.status === 'needs_rescue' && (
                        <button
                          onClick={() => updateMutation.mutate({ id: r.id, data: { status: 'in_progress', rescued_by: 'Volunteer Unit' } })}
                          className="flex-1 py-1.5 rounded-md bg-[#101820] hover:bg-gray-800 text-white text-[11px] font-bold tracking-wide"
                        >
                          Dispatch Team
                        </button>
                      )}
                      {(r.status === 'needs_rescue' || r.status === 'in_progress') && (
                        <button
                          onClick={() => updateMutation.mutate({ id: r.id, data: { status: 'rescued', rescue_notes: 'Confirmed safe at relief center.' } })}
                          className="flex-1 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold tracking-wide"
                        >
                          Mark Rescued (Safe)
                        </button>
                      )}
                      {r.status === 'rescued' && (
                        <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1 mx-auto">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Evacuated to Shelter {r.rescued_by ? `by ${r.rescued_by}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Distress SOS Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  <span>Register Emergency Flood SOS</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Your coordinates and phone will be verified by the AI triage layer and shared immediately with NDRF, SDRF, and verified community volunteers.
                </p>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitMutation.mutate(formData);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="font-bold text-gray-700 block mb-1">Contact Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-gray-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-gray-300"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Number of People *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formData.people_count}
                    onChange={(e) => setFormData({ ...formData, people_count: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 rounded-lg border border-gray-300"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700">GPS Location *</label>
                  <button
                    type="button"
                    onClick={handleUseLocation}
                    className="text-[#B79A62] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Get Device GPS</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                    placeholder="Latitude"
                    className="p-2.5 rounded-lg border border-gray-300 text-xs"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.lon}
                    onChange={(e) => setFormData({ ...formData, lon: parseFloat(e.target.value) || 0 })}
                    placeholder="Longitude"
                    className="p-2.5 rounded-lg border border-gray-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Address / Visual Landmark *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g., Near Ganesh Mandir, 2nd floor balcony, red brick house with blue gate"
                  value={formData.address_landmark}
                  onChange={(e) => setFormData({ ...formData, address_landmark: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-gray-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Current Water Level *</label>
                  <select
                    value={formData.water_level_stage}
                    onChange={(e) => setFormData({ ...formData, water_level_stage: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-gray-300 uppercase font-semibold"
                  >
                    <option value="ankle">Ankle Deep (Low)</option>
                    <option value="knee">Knee Deep (Moderate)</option>
                    <option value="waist">Waist Deep (Dangerous)</option>
                    <option value="chest">Chest Deep (Critical)</option>
                    <option value="rooftop">Rooftop Stranded (Extreme SOS)</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={formData.has_infants_or_elderly}
                      onChange={(e) => setFormData({ ...formData, has_infants_or_elderly: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded"
                    />
                    <span>Infants or Elderly Present</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Medical Emergency / Medication Needs</label>
                <input
                  type="text"
                  placeholder="e.g., Diabetic patient without insulin, oxygen support needed"
                  value={formData.medical_emergency_notes}
                  onChange={(e) => setFormData({ ...formData, medical_emergency_notes: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-gray-300"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-lg text-amber-900 text-[11px] space-y-1 border border-amber-200">
                <div className="font-bold flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5 text-amber-700" />
                  <span>AI Forgery Detection Notice</span>
                </div>
                <div>
                  Distress reports are analyzed against IMD precipitation radar and spatial proximity clusters. False alerts divert vital emergency boats and are punishable under Section 54 of the Disaster Management Act, 2005.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="px-6 py-2 rounded-lg bg-[#DC2626] hover:bg-red-700 text-white font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {submitMutation.isPending ? 'Verifying with AI...' : 'Submit Emergency SOS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
