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
  hazard_type?: string;
  headline: string;
  description?: string;
  area_description?: string;
  effective_at: string;
  expires_at?: string;
  retrieved_at: string;
  is_active: boolean;
  dos_and_donts?: { dos: string[]; donts: string[]; title?: string };
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
  geometry: any;  // GeoJSON LineString or coordinates
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
  | 'cyclone_damage'
  | 'landslide'
  | 'fire_flood'
  | 'earthquake_damage'
  | 'lightning_strike'
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
  ai_trust_score?: number;
  ai_flags_json?: string;
  is_suspicious?: boolean;
}

// ── Community Rescue Tracker ──────────────────────────────────────────────────
export type RescueStatus = 'needs_rescue' | 'in_progress' | 'rescued' | 'safe';

export interface RescueRequest {
  id: number;
  contact_name: string;
  phone: string;
  lat: number;
  lon: number;
  address_landmark: string;
  people_count: number;
  has_infants_or_elderly: boolean;
  medical_emergency_notes?: string;
  water_level_stage: string; // ankle, knee, waist, chest, rooftop
  status: RescueStatus;
  rescued_by?: string;
  rescue_notes?: string;
  ai_trust_score: number;
  ai_flags_json?: string;
  is_suspicious: boolean;
  created_at: string;
  updated_at?: string;
}

export interface RescueStatistics {
  total_requests: number;
  needs_rescue: number;
  in_progress: number;
  rescued: number;
  safe: number;
  people_awaiting_rescue: number;
  people_rescued: number;
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

// ── Marine & Coastal Fishermen Safety ─────────────────────────────────────────
export interface MarineHourlyPoint {
  time: string;
  wave_height_m: number | null;
  swell_wave_height_m: number | null;
  wave_period_s: number | null;
  swell_wave_period_s: number | null;
}

export interface MarineConditions {
  lat: number;
  lon: number;
  retrieved_at: string;
  current_wave_height_m: number;
  max_wave_height_3d_m: number;
  current_swell_height_m: number;
  advisory_status: string;
  advisory_level: 'green' | 'yellow' | 'orange' | 'red';
  advisory_reason: string;
  port_signal: string;
  hourly: MarineHourlyPoint[];
  attribution: string;
  disclaimer: string;
}

export interface CoastalFishingZone {
  zone_id: string;
  name: string;
  coast: string;
  state_code: string;
  district: string;
  lat: number;
  lon: number;
  port_warning_signal: string;
  typical_crafts: string[];
}

export interface RiverbankHighFlowZone {
  zone_id: string;
  river: string;
  name: string;
  district: string;
  state_code: string;
  lat: number;
  lon: number;
  vulnerability_type: string;
  buffer_evacuation_distance_m: number;
  emergency_advice: string;
}

// ── User Authentication & Profile ─────────────────────────────────────────────
export type UserRole = 'citizen' | 'volunteer' | 'admin';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  preferred_lat?: number;
  preferred_lon?: number;
  district_code?: string;
}

export interface AuthResponse {
  status: string;
  access_token: string;
  token_type: string;
  user: User;
}

// ── Multi-Hazard Dos and Don'ts ───────────────────────────────────────────────
export interface DosAndDontsItem {
  title: string;
  dos: string[];
  donts: string[];
}

export type DosAndDontsRegistry = Record<string, DosAndDontsItem>;

// ── API error ─────────────────────────────────────────────────────────────────
export interface ApiError {
  detail: string;
  code?: string;
}
