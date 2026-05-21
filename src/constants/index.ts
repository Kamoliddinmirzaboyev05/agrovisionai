import type { HistoryItem } from '@/types';

export const CROPS = [
  'Pomidor',
  'Bodring',
  'Kartoshka',
  'Uzum',
  'Paxta',
  "Bug'doy",
  'Piyoz',
  'Olma',
  'Boshqa',
];

export const LOADING_STEPS = [
  "Dala maydoni hisoblanmoqda...",
  "Sun'iy yo'ldosh ma'lumotlari olinmoqda...",
  "Ob-havo tahlil qilinmoqda...",
  "Rasm AI model orqali tekshirilmoqda...",
  "Yakuniy tavsiya tayyorlanmoqda...",
];

export const MOCK_HISTORY: HistoryItem[] = [
  { id: '1', date: '18 May 2025', crop: 'Pomidor', area: '25 sotix', risk: 'medium', problem: 'Shira ehtimoli' },
  { id: '2', date: '10 May 2025', crop: 'Bodring', area: '12 sotix', risk: 'low', problem: "Sog'lom holat" },
  { id: '3', date: '2 May 2025', crop: 'Paxta', area: '3 gektar', risk: 'high', problem: 'Zang kasalligi' },
  { id: '4', date: '25 Apr 2025', crop: "Bug'doy", area: '5 gektar', risk: 'low', problem: "Sog'lom holat" },
];

export const MAP_TILE_URL = import.meta.env.VITE_MAP_TILE_URL as string;
export const MAP_LABELS_URL = import.meta.env.VITE_MAP_LABELS_URL as string;
export const APP_NAME = import.meta.env.VITE_APP_NAME as string;
