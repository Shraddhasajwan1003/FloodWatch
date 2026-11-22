/**
 * FloodWatch India — Axios API client.
 * All external data calls go through the backend API, never directly from the frontend.
 */
import axios from 'axios';
import type {
  RainfallResponse,
  FloodRiskResponse,
  RiverStation,
  RiverDischargeResponse,
  OfficialAlert,
  RoutesResponse,
  CommunityReport,
  ReportCategory,
  Facility,
  FacilityType,
  DataSourceHealth,
  Notification,
  IndianState,
  District,
  SearchResult,
  RescueRequest,
  RescueStatistics,
  RescueStatus,
  MarineConditions,
  CoastalFishingZone,
  RiverbankHighFlowZone,
  User,
  AuthResponse,
  DosAndDontsRegistry,
} from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage if logged in
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('jaldrishti_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Health ────────────────────────────────────────────────────────────────────
export const getHealth = async () => {
  const res = await client.get('/health');
  return res.data;
};

// ── Locations ─────────────────────────────────────────────────────────────────
export const getStates = async (): Promise<IndianState[]> => {
  const res = await client.get('/locations/states');
  return res.data;
};

export const getDistricts = async (stateCode?: string): Promise<District[]> => {
  const res = await client.get('/locations/districts', {
    params: stateCode ? { state_code: stateCode } : {},
  });
  return res.data;
};

export const searchLocation = async (query: string): Promise<SearchResult[]> => {
  const res = await client.get('/locations/search', { params: { q: query } });
  return res.data;
};

// ── Rainfall ──────────────────────────────────────────────────────────────────
export const getRainfall = async (lat: number, lon: number, hours = 48): Promise<RainfallResponse> => {
  const res = await client.get('/rainfall', { params: { lat, lon, hours } });
  return res.data;
};

// ── Rivers ────────────────────────────────────────────────────────────────────
export const getRiverStations = async (stateCode?: string): Promise<RiverStation[]> => {
  const res = await client.get('/rivers/stations', {
    params: stateCode ? { state_code: stateCode } : {},
  });
  return Array.isArray(res.data) ? res.data : (res.data.stations || []);
};

export const getRiverDischarge = async (stationCode: string): Promise<RiverDischargeResponse> => {
  const res = await client.get(`/rivers/stations/${stationCode}/discharge`);
  return res.data;
};

// ── Flood Risk ────────────────────────────────────────────────────────────────
export const getFloodRisk = async (lat: number, lon: number): Promise<FloodRiskResponse> => {
  const res = await client.get('/flood-risk', { params: { lat, lon } });
  return res.data;
};

export const getDistrictRisk = async (districtCode: string): Promise<FloodRiskResponse> => {
  const res = await client.get(`/flood-risk/district/${districtCode}`);
  return res.data;
};

// ── Alerts ────────────────────────────────────────────────────────────────────
export const getAlerts = async (stateCode?: string, hazardType?: string): Promise<OfficialAlert[]> => {
  const params: Record<string, string> = {};
  if (stateCode) params.state = stateCode;
  if (hazardType && hazardType !== 'all') params.hazard_type = hazardType;
  const res = await client.get('/alerts', { params });
  return Array.isArray(res.data) ? res.data : (res.data.alerts || []);
};

export const getDosAndDonts = async (hazardType?: string): Promise<DosAndDontsRegistry> => {
  const res = await client.get('/alerts/dos-and-donts', {
    params: hazardType ? { hazard_type: hazardType } : {},
  });
  return res.data;
};

// ── Safe Routes ───────────────────────────────────────────────────────────────
export const calculateRoutes = async (
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
): Promise<RoutesResponse> => {
  const res = await client.post('/routes/calculate', {
    origin_lat: originLat,
    origin_lon: originLon,
    dest_lat: destLat,
    dest_lon: destLon,
  });
  return res.data;
};

// ── Community Reports ─────────────────────────────────────────────────────────
export const getNearbyReports = async (
  lat: number,
  lon: number,
  radiusKm = 5,
): Promise<CommunityReport[]> => {
  const res = await client.get('/reports', {
    params: { lat, lon, radius_km: radiusKm },
  });
  return res.data;
};

export const submitReport = async (formData: FormData): Promise<CommunityReport> => {
  const res = await client.post('/reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// ── Facilities ────────────────────────────────────────────────────────────────
export const getNearbyFacilities = async (
  lat: number,
  lon: number,
  radiusKm = 10,
  facilityType?: FacilityType,
): Promise<Facility[]> => {
  const res = await client.get('/facilities', {
    params: { lat, lon, radius_km: radiusKm, ...(facilityType && { type: facilityType }) },
  });
  return res.data;
};

// ── Forecasts ─────────────────────────────────────────────────────────────────
export const getForecasts = async (lat: number, lon: number, days = 7) => {
  const res = await client.get('/forecasts', { params: { lat, lon, days } });
  return res.data;
};

// ── Data Sources ──────────────────────────────────────────────────────────────
export const getDataSources = async (): Promise<DataSourceHealth[]> => {
  const res = await client.get('/data-sources');
  return res.data;
};

// ── Community Rescue ──────────────────────────────────────────────────────────
export const getRescueRequests = async (params?: {
  status?: RescueStatus;
  lat?: number;
  lon?: number;
  radius_km?: number;
}): Promise<RescueRequest[]> => {
  const res = await client.get('/rescue', { params });
  return Array.isArray(res.data) ? res.data : (res.data.requests || []);
};

export const getRescueStatistics = async (): Promise<RescueStatistics> => {
  const res = await client.get('/rescue/statistics');
  return res.data;
};

export const submitRescueRequest = async (data: {
  contact_name: string;
  phone: string;
  lat: number;
  lon: number;
  address_landmark: string;
  people_count?: number;
  has_infants_or_elderly?: boolean;
  medical_emergency_notes?: string;
  water_level_stage?: string;
}): Promise<RescueRequest> => {
  const res = await client.post('/rescue', data);
  return res.data;
};

export const updateRescueStatus = async (
  id: number,
  data: {
    status: RescueStatus;
    rescued_by?: string;
    rescue_notes?: string;
  },
): Promise<RescueRequest> => {
  const res = await client.patch(`/rescue/${id}/status`, data);
  return res.data;
};

// ── Marine & Coastal Fishermen Safety ─────────────────────────────────────────
export const getMarineConditions = async (lat = 20.2644, lon = 86.6710): Promise<MarineConditions> => {
  const res = await client.get('/marine/conditions', { params: { lat, lon } });
  return res.data;
};

export const getCoastalZones = async (): Promise<CoastalFishingZone[]> => {
  const res = await client.get('/marine/zones');
  return res.data;
};

export const getRiverbankZones = async (): Promise<RiverbankHighFlowZone[]> => {
  const res = await client.get('/marine/riverbanks');
  return res.data;
};

// ── User Authentication & Profile ─────────────────────────────────────────────
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const res = await client.post('/auth/login', { email, password });
  if (res.data.access_token) {
    localStorage.setItem('jaldrishti_auth_token', res.data.access_token);
  }
  return res.data;
};

export const register = async (data: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: string;
  district_code?: string;
}): Promise<AuthResponse> => {
  const res = await client.post('/auth/register', data);
  if (res.data.access_token) {
    localStorage.setItem('jaldrishti_auth_token', res.data.access_token);
  }
  return res.data;
};

export const getMe = async (): Promise<User> => {
  const res = await client.get('/auth/me');
  return res.data;
};

export const updateUserLocation = async (lat: number, lon: number, districtCode?: string) => {
  const res = await client.patch('/auth/location', { lat, lon, district_code: districtCode });
  return res.data;
};

export const logout = () => {
  localStorage.removeItem('jaldrishti_auth_token');
};

// ── AI Assistant ──────────────────────────────────────────────────────────────
export const askAssistant = async (
  message: string,
): Promise<{ reply: string; source_tag: string }> => {
  const res = await client.post('/assistant/chat', { message }, { timeout: 45000 });
  return res.data;
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications = async (limit = 20): Promise<Notification[]> => {
  const res = await client.get('/notifications', { params: { limit } });
  return res.data;
};
