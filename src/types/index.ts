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
  id: number;
  username: string;
  first_name: string;
  email: string;
  region?: string;
  avatar?: string;
  date_joined?: string;
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
  id: number;
  name: string;
  crop: string;
  coordinates: LatLng[];
  center_lat: number;
  center_lng: number;
  area_ha: number;
  area_sotix: number;
  last_irrigation?: string;
  water_cycle?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AnalysisResult {
  risk_level: RiskLevel;
  status_text: string;
  recommendations: string[];
  ndvi?: {
    current: number;
    change: number;
    drought_index: number;
    monthly?: any[];
  };
  analysis?: {
    osimlik_holati: string;
    xulosa: string;
    qurgochlik: string;
    ustuvor_harakatlar: string[];
    dehqonchilik_maslahati: string[];
    ndvi_baho?: string;
  };
  location?: {
    area_ha: number;
  };
  area_ha?: number;
  soil_moisture?: string;
  confidence?: string;
  problem?: string;
  soil?: {
    properties?: {
      ph_h2o?: number;
      soc?: number;
      nitrogen?: number;
      bdod?: number;
      sand?: number;
      clay?: number;
      silt?: number;
    };
    surface_temp?: number;
    moisture_0_1cm?: number;
  };
  weather?: {
    avg_temp: number;
    annual_precip: number;
    avg_wind: number;
    avg_humidity: number;
    monthly: any[];
  };
  source?: string;
   ndvi_current?: number;
   ndvi_change?: number;
   ndvi_label?: string;
   drought_index?: number;
   temperature?: number;
   weather_forecast?: string;
 }
