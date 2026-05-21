export type RiskLevel = "low" | "medium" | "high";
export type NavTab = "home" | "field" | "results" | "profile";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface HistoryItem {
  id: string;
  date: string;
  crop: string;
  area: string;
  risk: RiskLevel;
  problem: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  region: string;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface FieldData {
  points: LatLng[];
  crop: string;
  name?: string;
  area_ha?: number;
  lastIrrigation?: string;
  waterCycle?: string;
}

export interface SavedField {
  id: string;
  name: string;
  crop: string;
  polygon: GeoJSON.Feature<GeoJSON.Polygon>;
  area: { m2: number; sotix: number; hectare: number };
  createdAt: string;
}

export interface AnalysisResult {
  risk_level: RiskLevel;
  ndvi_current: number;
  ndvi_change: number;
  ndvi_label: string;
  drought_index: number;
  area_ha: number;
  soil_moisture: string;
  confidence: string;
  problem: string;
  status_text: string;
  recommendations: string[];
  temperature?: number;
  weather_forecast?: string;
}
