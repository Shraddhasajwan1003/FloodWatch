/**
 * FloodWatch India — TypeScript type definitions.
 * Mirrors the backend Pydantic schemas.
 */

// ── Risk levels ──────────────────────────────────────────────────────────────
export type RiskLevel = 'green' | 'yellow' | 'orange' | 'red' | 'unknown';
export type DataQuality = 'live' | 'stale' | 'unavailable' | 'estimated' | 'simulated';
export type ReportStatus = 'unverified' | 'under_review' | 'corroborated' | 'verified' | 'rejected' | 'expired';
export type FacilityType = 'hospital' | 'shelter' | 'relief_camp' | 'fire_station' | 'police_station';
export type AlertSeverity = 'watch' | 'warning' | 'severe' | 'extreme';

// ── Geographic ───────────────────────────────────────────────────────────────
export interface IndianState {
  id: number;
  code: string;
  name: string;
  name_hi?: string;
  centroid_lat?: number;
  centroid_lon?: number;
}

export interface District {
  id: number;
  state_id: number;
  code: string;
  name: string;
  name_hi?: string;
  centroid_lat: number;
  centroid_lon: number;
  state?: IndianState;
}

export interface SearchResult {
  name: string;
  display_name: string;
  lat: number;
  lon: number;
  type: string;
  place_id?: string;
}

// ── Rainfall ─────────────────────────────────────────────────────────────────
export interface RainfallHour {
  valid_at: string;   // ISO 8601
  precipitation_mm: number | null;
  precipitation_probability_pct: number | null;
  temperature_2m_c: number | null;
  data_type: 'forecast' | 'model_reanalysis';
}

export interface RainfallResponse {
  source_id: string;
  attribution: string;
  retrieved_at: string;
  data_type: string;
  quality: DataQuality;
  lat: number;
  lon: number;
  elevation_m?: number;
  hourly: RainfallHour[];
  // Aggregates for convenience
  total_1h_mm: number | null;
  total_6h_mm: number | null;
  total_24h_mm: number | null;
  forecast_24h_mm: number | null;
}

// ── River ────────────────────────────────────────────────────────────────────
export interface RiverStation {
  id: number;
  station_code: string;
  name: string;
  river_name: string;
  lat: number;
  lon: number;
  measurement_type: string;
  warning_level_m: number | null;
  danger_level_m: number | null;
  is_active: boolean;
  source_id: string;
}

export interface RiverDischargeDay {
  valid_date: string;
  river_discharge_m3s: number | null;
  data_type: string;
}

export interface RiverDischargeResponse {
  station: RiverStation;
  source_id: string;
  attribution: string;
  retrieved_at: string;
  quality: DataQuality;
  daily: RiverDischargeDay[];
  latest_discharge_m3s: number | null;
  latest_date: string | null;
  disclaimer: string;
}

// ── Flood Risk ───────────────────────────────────────────────────────────────
export interface RiskBreakdown {
  recent_rainfall_1h: number | null;
  recent_rainfall_6h: number | null;
  forecast_rainfall_24h: number | null;
  river_level_pct: number | null;
  river_rise_rate: number | null;
  community_reports: number | null;
}

export interface FloodRiskResponse {
  district_code?: string;
  district_name?: string;
  lat: number;
  lon: number;
  assessed_at: string;
  score: number | null;
  level: RiskLevel;
  displayed_level: RiskLevel;
  official_override: boolean;
  model_version: string;
  is_provisional: boolean;
  breakdown: RiskBreakdown;
  missing_inputs: string[];
  explanation: string;
  official_alert?: OfficialAlert;
  data_quality: DataQuality;
  // Input data summaries
  rainfall_1h_mm: number | null;
  rainfall_24h_mm: number | null;
  forecast_24h_mm: number | null;
}

// ── Alerts ───────────────────────────────────────────────────────────────────
export interface OfficialAlert {
  id: number;
  alert_id: string;
  source_id: string;
  issuer: string;
  severity: AlertSeverity;
  headline: string;
  description?: string;
  area_description?: string;
  effective_at: string;
  expires_at?: string;
  retrieved_at: string;
  is_active: boolean;
}

// ── Safe Routes ───────────────────────────────────────────────────────────────
export interface RouteStep {
  instruction: string;
  distance_m: number;
  duration_s: number;
  maneuver?: string;
  has_flood_warning?: boolean;
  warning_note?: string;
}

export interface RouteOption {
  route_id: string;
  preference: 'fastest' | 'balanced' | 'lower_risk';
  distance_m: number;
  duration_s: number;
  flood_exposure_score: number | null;
  flood_exposure_label: RiskLevel;
  known_hazards: string[];
  road_closures: string[];
  geometry: string;  // Encoded polyline
  steps: RouteStep[];
  explanation: string;
  data_coverage: string;
  uncertainty: string;
}

export interface RoutesResponse {
  origin: { lat: number; lon: number; name?: string };
  destination: { lat: number; lon: number; name?: string };
  assessed_at: string;
  routes: RouteOption[];
  disclaimer: string;
  data_sources: string[];
}

// ── Community Reports ─────────────────────────────────────────────────────────
export type ReportCategory = 
  | 'waterlogging'
  | 'road_blocked'
  | 'bridge_damage'
  | 'basement_flooding'
  | 'drain_overflow'
  | 'other';

export interface CommunityReport {
  id: number;
  lat: number;
  lon: number;
  category: ReportCategory;
  description: string;
  water_depth_cm?: number;
  road_blocked: boolean;
  status: ReportStatus;
  submitted_at: string;
  expires_at?: string;
  image_url?: string;
  district_id?: number;
}

// ── Facilities ────────────────────────────────────────────────────────────────
export interface Facility {
  id: number;
  name: string;
  facility_type: FacilityType;
  lat: number;
  lon: number;
  address?: string;
  phone?: string;
  is_verified: boolean;
  is_operational?: boolean;
  source: string;
  distance_km?: number;
}

// ── Data Sources ──────────────────────────────────────────────────────────────
export interface DataSourceHealth {
  source_key: string;
  name: string;
  provider: string;
  data_type: string;
  endpoint_url?: string;
  geographic_coverage?: string;
  is_active: boolean;
  health_status: 'healthy' | 'stale' | 'failing' | 'disabled';
  last_success_at?: string;
  last_failure_at?: string;
  last_failure_message?: string;
  licence?: string;
  attribution: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export interface Notification {
  id: number;
  event_type: string;
  severity: string;
  title: string;
  body: string;
  created_at: string;
  district_id?: number;
  state_id?: number;
}

// ── API error ─────────────────────────────────────────────────────────────────
export interface ApiError {
  detail: string;
  code?: string;
}
