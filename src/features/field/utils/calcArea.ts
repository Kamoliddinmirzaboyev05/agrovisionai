import type { LatLng } from '@/types';

export function calcArea(points: LatLng[]): { m2: number; sotix: number; hectare: number } {
  if (points.length < 3) return { m2: 0, sotix: 0, hectare: 0 };

  let area = 0;
  const n = points.length;
  const R = 6371000;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = (points[i].lat * Math.PI) / 180;
    const lat2 = (points[j].lat * Math.PI) / 180;
    const lng1 = (points[i].lng * Math.PI) / 180;
    const lng2 = (points[j].lng * Math.PI) / 180;
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  const m2 = Math.abs((area * R * R) / 2);
  return {
    m2: Math.round(m2),
    sotix: Math.round(m2 / 100),
    hectare: Math.round((m2 / 10000) * 100) / 100,
  };
}
