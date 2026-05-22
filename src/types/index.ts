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
  plan?: "Bepul" | "Pro" | "Max";
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
  id?: number;
  ndvi_label?: string;
  created_at?: string;
  name?: string;
  center_lat?: number;
  center_lng?: number;
  area_ha?: number;
  coordinates?: LatLng[];
  ndvi_current?: number;
  ndvi_change?: number;
  drought_index?: number;
  ndwi_current?: number | null;
  location?: {
    lat: number;
    lng: number;
    area_ha: number;
  };
  ndvi?: {
    current: number;
    change: number;
    monthly: Array<{
      month: string;
      temp: number;
      precip: number;
      et: number;
      radiation: number;
      wind: number;
      humidity: number;
      ndvi: number;
      evi: number;
      ndwi: number | null;
      ndvi_source: string;
    }>;
    drought_index: number;
    ndwi_current: number | null;
  };
  soil?: {
    surface_temp: number;
    depth_6cm_temp: number;
    depth_18cm_temp: number;
    moisture_0_1cm: number;
    moisture_1_3cm: number;
    moisture_3_9cm: number;
    moisture_9_27cm: number;
    humidity: number;
    wind_speed: number;
    properties: {
      ph: number | null;
      ph_label: string | null;
      clay_pct: number | null;
      sand_pct: number | null;
      silt_pct: number | null;
      texture: string | null;
      nitrogen_g_kg: number | null;
      nitrogen_label: string | null;
      cec_cmol_kg: number | null;
      cec_label: string | null;
      soc_g_kg: number | null;
      soc_label: string | null;
      bulk_density: number | null;
      gwet_top: number;
      gwet_root: number;
      gwet_prof: number;
      gwet_top_label: string;
      gwet_root_label: string;
      soilgrids_ok: boolean;
      nasa_ok: boolean;
      ph_h2o: number | null;
      clay: number | null;
      sand: number | null;
      soc: number | null;
      nitrogen: number | null;
    };
  };
  weather?: {
    monthly: Array<{
      month: string;
      temp: number;
      precip: number;
      wind: number;
      humidity: number;
    }>;
    annual_precip: number;
    avg_temp: number;
    avg_wind: number;
    avg_humidity: number;
  };
  analysis?: {
    yer_tahlili: {
      umumiy_baho: string;
      tuproq_sifati: string;
      suv_holati: string;
      iqlim_sharoit: string;
      osimlik_holati: string;
    };
    ekin_tavsiyalari: Array<{
      ekin: string;
      nima_uchun_mos: string;
      hosil_tonnada: string;
      narx_som: string;
      daromad_taxmin: string;
      xarajat_taxmin: string;
      sof_foyda: string;
      ekish_vaqti: string;
      "yig'im_vaqti": string;
      asosiy_xavf: string;
    }>;
    eng_foydali_ekin: string;
    sugorish_rejasi: {
      manba: string;
      chastota: string;
      usul: string;
    };
    ogit_rejasi: string[];
    bugun_nima_qilish: string[];
    xavflar: string[];
    yillik_reja: Record<string, string>;
    xulosa: string;
    umumiy_holat: string;
    osimlik_holati: string;
    tuproq_izoh: string;
    suv_izoh: string;
    ob_havo_izoh: string;
    tavsiya_ekinlar: string[];
    ustuvor_harakatlar: string[];
    ehtiyot_bolish: string[];
  };
  water?: {
    summary: {
      closest_name: string;
      closest_type_uz: string;
      closest_dist_km: number;
      closest_dist_text: string;
      closest_direction: string;
      irrigation_source: {
        name: string;
        type: string;
        type_uz: string;
        distance_km: number;
        distance_text: string;
        direction: string;
        irrigation_ok: boolean;
        lat: number;
        lng: number;
      };
      total_found: number;
      plain_text: string;
    };
    sources: Array<{
      name: string;
      type: string;
      type_uz: string;
      distance_km: number;
      distance_text: string;
      direction: string;
      irrigation_ok: boolean;
      lat: number;
      lng: number;
    }>;
  };
  source?: string;
  saved_id?: number;
  field_id?: number;
  ndvi_monthly?: Array<{
    month: string;
    temp: number;
    precip: number;
    et: number;
    radiation: number;
    wind: number;
    humidity: number;
    ndvi: number;
    evi: number;
    ndwi: number | null;
    ndvi_source: string;
  }>;
  soil_data?: any;
  weather_data?: any;
  ai_analysis?: any;
}
