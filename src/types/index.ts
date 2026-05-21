export type RiskLevel = 'low' | 'medium' | 'high';
export type NavTab = 'home' | 'field' | 'results' | 'profile';

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
  lastIrrigation?: string;
  waterCycle?: string;
}
