import type { ElementType } from 'react';

interface StatsCardProps {
  icon: ElementType;
  label: string;
  value: string;
  color: string;
  bg: string;
}

export function StatsCard({ icon: Icon, label, value, color, bg }: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-border shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
