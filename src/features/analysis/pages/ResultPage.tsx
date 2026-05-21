import { useState } from 'react';
import {
  Leaf,
  Map,
  AlertTriangle,
  Activity,
  Star,
  Droplets,
  Thermometer,
  AlertCircle,
  Eye,
  Info,
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { FieldData } from '@/types';
import { calcArea } from '@/features/field/utils/calcArea';

function getFieldInfo(): { crop: string; area: string } {
  try {
    const raw = sessionStorage.getItem('fieldData');
    if (!raw) return { crop: 'Pomidor', area: '25 sotix' };
    const data: FieldData = JSON.parse(raw);
    const a = calcArea(data.points);
    const area = a.sotix > 0 ? `${a.sotix} sotix` : '25 sotix';
    return { crop: data.crop || 'Pomidor', area };
  } catch {
    return { crop: 'Pomidor', area: '25 sotix' };
  }
}

export function ResultPage() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<'overview' | 'recommendations'>('overview');
  const { crop, area } = getFieldInfo();

  const recommendations = [
    { icon: AlertTriangle, text: 'Shiraga qarshi dori ishlatish tavsiya etiladi', color: 'text-red-600', bg: 'bg-red-50' },
    { icon: Eye, text: 'Barg ostini tekshiring', color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: Leaf, text: 'Zararlangan barglarni ajrating', color: 'text-orange-600', bg: 'bg-orange-50' },
    { icon: Droplets, text: 'Kechki payt sug\'oring', color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: Star, text: 'Kunduzi sug\'orishdan saqlaning', color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: Info, text: "Dorini ishlatishdan oldin yorliqdagi me'yorni tekshiring", color: 'text-green-600', bg: 'bg-green-50' },
  ];

  const statusBanner = (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Umumiy holat</p>
        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">O'rtacha xavf</span>
      </div>
      <p className="text-sm leading-relaxed opacity-95">
        Pomidor ekinida shira ehtimoli bor. Tuproq namligi past, kechki payt sug'orish tavsiya etiladi.
      </p>
    </div>
  );

  const metricsGrid = (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard icon={Leaf} label="Ekin turi" value={crop} color="text-green-600" bg="bg-green-50" />
      <MetricCard icon={Map} label="Maydon" value={area} color="text-blue-600" bg="bg-blue-50" />
      <MetricCard icon={AlertTriangle} label="Kasallik" value="Shira ehtimoli" color="text-red-600" bg="bg-red-50" />
      <MetricCard icon={Activity} label="Ishonch" value="82%" color="text-purple-600" bg="bg-purple-50" />

      {/* NDVI card */}
      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
            <Star className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            O'simlik holati (NDVI)
          </p>
        </div>
        <div className="flex items-end gap-2 mb-2">
          <p className="text-2xl font-extrabold text-foreground">0.56</p>
          <p className="text-sm text-amber-600 font-semibold mb-1">O'rtacha</p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-400 via-amber-400 to-green-500"
            style={{ width: '56%' }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Yomon</span>
          <span>Yaxshi</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center mb-2">
          <Droplets className="w-4 h-4 text-blue-600" />
        </div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Yer namligi</p>
        <p className="text-lg font-extrabold text-red-600 mt-1">Past</p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
        <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center mb-2">
          <Thermometer className="w-4 h-4 text-orange-600" />
        </div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Ob-havo</p>
        <p className="text-lg font-extrabold text-foreground mt-1">35°C</p>
        <p className="text-xs text-muted-foreground">Yomg'ir kutilmaydi</p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm col-span-2 flex items-center gap-4">
        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Suv xavfi</p>
          <p className="text-xl font-extrabold text-red-600">Yuqori</p>
          <p className="text-xs text-muted-foreground">Zudlik bilan sug'orish kerak</p>
        </div>
      </div>
    </div>
  );

  const recsList = (
    <div className="flex flex-col gap-3">
      {recommendations.map(({ icon: Icon, text, color, bg }, i) => (
        <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl border border-border ${bg}`}>
          <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color}`} />
          <p className="text-sm font-medium text-foreground leading-snug">{text}</p>
        </div>
      ))}
    </div>
  );

  if (!isMobile) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-6xl mx-auto w-full">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tahlil Natijalari</h2>
          <p className="text-sm text-muted-foreground mt-1">AI tahlili yakunlandi</p>
        </div>
        {statusBanner}
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-foreground">Ko'rsatkichlar</h3>
            {metricsGrid}
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-foreground">Tavsiyalar</h3>
            {recsList}
          </div>
        </div>
      </div>
    );
  }

  // Mobile
  return (
    <div className="flex flex-col h-full">
      <div className="mx-4 mt-4">{statusBanner}</div>
      <div className="mx-4 mt-4 bg-muted rounded-2xl p-1 flex">
        <button
          onClick={() => setTab('overview')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === 'overview' ? 'bg-white text-green-700 shadow' : 'text-muted-foreground'
          }`}
        >
          Ko'rsatkichlar
        </button>
        <button
          onClick={() => setTab('recommendations')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === 'recommendations' ? 'bg-white text-green-700 shadow' : 'text-muted-foreground'
          }`}
        >
          Tavsiyalar
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 mt-4 pb-4">
        {tab === 'overview' ? metricsGrid : recsList}
      </div>
    </div>
  );
}
