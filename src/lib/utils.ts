import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { RiskLevel } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function riskColor(risk: RiskLevel) {
  if (risk === 'low')
    return { badge: 'bg-green-500', label: 'Xavf past', text: 'text-green-700', light: 'bg-green-50' };
  if (risk === 'medium')
    return { badge: 'bg-amber-500', label: "O'rtacha xavf", text: 'text-amber-700', light: 'bg-amber-50' };
  return { badge: 'bg-red-500', label: 'Yuqori xavf', text: 'text-red-700', light: 'bg-red-50' };
}
