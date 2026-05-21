import type { ElementType } from 'react';

interface MetricCardProps {
  icon: ElementType;
  label: string;
  value: string;
  color: string;
  bg: string;
  wide?: boolean;
  children?: React.ReactNode;
}

export function MetricCard({ icon: Icon, label, value, color, bg, wide, children }: MetricCardProps) {
  return (
    <div className={`bg-white rounded-2xl p-4 border border-border shadow-sm ${wide ? 'col-span-2' : ''}`}>
      <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-extrabold mt-1 ${color}`}>{value}</p>
      {children}
    </div>
  );
}
