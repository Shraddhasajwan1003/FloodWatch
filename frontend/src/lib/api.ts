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
} from '@/types';

const API_BASE = '/api/v1';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
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
  return res.data;
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
export const getAlerts = async (stateCode?: string): Promise<OfficialAlert[]> => {
  const res = await client.get('/alerts', {
    params: stateCode ? { state_code: stateCode } : {},
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

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications = async (limit = 20): Promise<Notification[]> => {
  const res = await client.get('/notifications', { params: { limit } });
  return res.data;
};
