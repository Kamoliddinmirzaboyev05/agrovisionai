
import { api } from "@/lib/api";
import type { SavedField, AnalysisResult } from "@/types";

const ENDPOINTS = {
  FIELDS: "/api/satellite/fields/",
  ANALYZE: "/api/satellite/analyze/",
};

export const fieldService = {
  /**
   * Barcha saqlangan dalalarni olish
   */
  getFields: () => {
    return api.get<{ results: SavedField[] }>(ENDPOINTS.FIELDS);
  },

  /**
   * Yangi dala saqlash
   */
  createField: (data: Partial<SavedField>) => {
    return api.post<SavedField>(ENDPOINTS.FIELDS, data);
  },

  /**
   * Mavjud dalani yangilash
   */
  updateField: (id: number, data: Partial<SavedField>) => {
    return api.patch<SavedField>(`${ENDPOINTS.FIELDS}${id}/`, data);
  },

  /**
   * Dalani o'chirish
   */
  deleteField: (id: number) => {
    return api.delete(`${ENDPOINTS.FIELDS}${id}/`);
  },

  /**
   * Dala tahlilini boshlash
   */
  analyzeField: (data: {
    coordinates: any[];
    area_ha: number;
    save: boolean;
    name: string;
    last_irrigation?: string;
    water_cycle?: number;
  }) => {
    return api.post<AnalysisResult>(ENDPOINTS.ANALYZE, data);
  },
};
