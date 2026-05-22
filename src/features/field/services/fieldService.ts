
import { api } from "@/lib/api";
import type { SavedField, AnalysisResult, CropImageAnalysis } from "@/types";

const ENDPOINTS = {
  FIELDS: "/api/satellite/fields/",
  ANALYZE: "/api/satellite/analyze/",
  HISTORY: "/api/satellite/history/",
  CROP_IMAGE_ANALYZE: "/api/satellite/crop-images/analyze/",
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

  /**
   * Dala tahlili tarixini olish
   */
  getFieldHistory: (id: number) => {
    return api.get<AnalysisResult>(`${ENDPOINTS.HISTORY}${id}/`);
  },

  /**
   * Ekin rasmini tahlil qilish (AI yordamida)
   */
  analyzeCropImage: (image: File, fieldId?: number) => {
    const formData = new FormData();
    formData.append("image", image);
    if (fieldId) formData.append("field", fieldId.toString());

    return api.post<CropImageAnalysis>(ENDPOINTS.CROP_IMAGE_ANALYZE, formData);
  },
};
