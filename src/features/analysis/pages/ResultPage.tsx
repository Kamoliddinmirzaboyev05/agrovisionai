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

interface Recommendation {
  icon: any;
  text: string;
  color: string;
  bg: string;
}

function getAnalysisData() {
  const rawField = sessionStorage.getItem('fieldData');
  const rawResult = sessionStorage.getItem('analysisResult');
  
  const fieldData: FieldData | null = rawField ? JSON.parse(rawField) : null;
  const analysisResult = rawResult ? JSON.parse(rawResult) : null;

  const a = fieldData ? calcArea(fieldData.points) : { sotix: 25 };
  const area = a.sotix > 0 ? `${a.sotix} sotix` : '25 sotix';
  
  return {
    crop: fieldData?.crop || 'Pomidor',
    area,
    result: analysisResult
  };
}

export function ResultPage() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<'overview' | 'recommendations'>('overview');
  const { crop, area, result } = getAnalysisData();

  // Mapping backend data to UI
  const riskLevel = result?.risk_level || (result?.ndvi_current < 0.2 ? 'high' : result?.ndvi_current < 0.5 ? 'medium' : 'low');
  const statusText = result?.status_text || result?.ndvi_label || `${crop} ekinida shira ehtimoli bor. Tuproq namligi past, kechki payt sug'orish tavsiya etiladi.`;
  const ndviValue = result?.ndvi_current ?? 0.56;
  const ndviChange = result?.ndvi_change ?? 0.034;
  const droughtIndex = result?.drought_index ?? 0.18;
  const areaHa = result?.area_ha ?? (parseFloat(area) / 100);
  const soilMoisture = result?.soil_moisture || (droughtIndex > 0.5 ? 'Quruq' : 'Nam');
  const confidence = result?.confidence || '82%';
  const problem = result?.problem || result?.ndvi_label || 'Shira ehtimoli';
  
  const backendRecs: Recommendation[] = result?.recommendations?.map((text: string, i: number) => {
    const icons = [AlertTriangle, Eye, Leaf, Droplets, Star, Info];
    const colors = ['text-red-600', 'text-amber-600', 'text-orange-600', 'text-blue-600', 'text-amber-600', 'text-green-600'];
    const bgs = ['bg-red-50', 'bg-amber-50', 'bg-orange-50', 'bg-blue-50', 'bg-amber-50', 'bg-green-50'];
    
    return {
      icon: icons[i % icons.length],
      text,
      color: colors[i % colors.length],
      bg: bgs[i % bgs.length]
    };
  }) || [
    { icon: AlertTriangle, text: 'Sug\'orish rejimini qayta ko\'rib chiqing', color: 'text-red-600', bg: 'bg-red-50' },
    { icon: Droplets, text: 'Kechki payt sug\'orish tavsiya etiladi', color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: Leaf, text: 'NDVI ko\'rsatkichi o\'zgarishini kuzatib boring', color: 'text-green-600', bg: 'bg-green-50' },
    { icon: Info, text: 'Ob-havo ma\'lumotlariga asosan ish ko\'ring', color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const riskLabel = {
    low: "Past xavf",
    medium: "O'rtacha xavf",
    high: "Yuqori xavf"
  }[riskLevel as 'low' | 'medium' | 'high'] || "O'rtacha xavf";

  const statusBanner = (
    <div className={`rounded-2xl p-5 text-white shadow-lg bg-gradient-to-r ${
      riskLevel === 'high' ? 'from-red-600 to-red-500' : 
      riskLevel === 'medium' ? 'from-amber-500 to-orange-500' : 
      'from-green-600 to-emerald-500'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Umumiy holat</p>
        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">{riskLabel}</span>
      </div>
      <p className="text-sm leading-relaxed opacity-95">
        {statusText}
      </p>
    </div>
  );

  const metricsGrid = (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard icon={Leaf} label="Ekin turi" value={crop} color="text-green-600" bg="bg-green-50" />
      <MetricCard icon={Map} label="Maydon" value={areaHa >= 1 ? `${areaHa.toFixed(2)} ha` : area} color="text-blue-600" bg="bg-blue-50" />
      <MetricCard icon={AlertTriangle} label="Holat" value={problem} color="text-red-600" bg="bg-red-50" />
      <MetricCard icon={Activity} label="Qurg'oqchilik" value={droughtIndex.toString()} color="text-orange-600" bg="bg-orange-50" />

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
          <p className="text-2xl font-extrabold text-foreground">{ndviValue}</p>
          <div className="flex flex-col mb-1">
            <p className={`text-[10px] font-bold ${ndviChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {ndviChange >= 0 ? '+' : ''}{ndviChange} o'zgarish
            </p>
            <p className={`text-xs font-semibold ${ndviValue > 0.7 ? 'text-green-600' : ndviValue > 0.4 ? 'text-amber-600' : 'text-red-600'}`}>
              {ndviValue > 0.7 ? 'Yaxshi' : ndviValue > 0.4 ? 'O\'rtacha' : 'Yomon'}
            </p>
          </div>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-400 via-amber-400 to-green-500"
            style={{ width: `${ndviValue * 100}%` }}
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
        <p className={`text-lg font-extrabold mt-1 ${soilMoisture === 'Past' ? 'text-red-600' : 'text-green-600'}`}>{soilMoisture}</p>
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
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${droughtIndex > 0.4 ? 'bg-red-100' : 'bg-green-100'}`}>
          <AlertCircle className={`w-6 h-6 ${droughtIndex > 0.4 ? 'text-red-600' : 'text-green-600'}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Suv ehtiyoji</p>
          <p className={`text-xl font-extrabold ${droughtIndex > 0.4 ? 'text-red-600' : 'text-green-600'}`}>
            {droughtIndex > 0.7 ? 'Juda yuqori' : droughtIndex > 0.4 ? 'Yuqori' : 'Normal'}
          </p>
          <p className="text-xs text-muted-foreground">
            {droughtIndex > 0.4 ? "Zudlik bilan sug'orish tavsiya etiladi" : "Sug'orish talab etilmaydi"}
          </p>
        </div>
      </div>
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
            <div className="flex flex-col gap-3">
              {backendRecs.map(({ icon: Icon, text, color, bg }: Recommendation, i: number) => (
                <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl border border-border ${bg}`}>
                  <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color}`} />
                  <p className="text-sm font-medium text-foreground leading-snug">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Tabs */}
      <div className="flex-shrink-0 px-4 pt-5 pb-3">
        <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
          <button
            onClick={() => setTab('overview')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              tab === 'overview' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            Tahlil
          </button>
          <button
            onClick={() => setTab('recommendations')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              tab === 'recommendations' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            Tavsiyalar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {tab === 'overview' ? (
          <div className="flex flex-col gap-4">
            {statusBanner}
            {metricsGrid}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {backendRecs.map(({ icon: Icon, text, color, bg }: Recommendation, i: number) => (
              <div
                key={i}
                className={`flex items-start gap-4 p-4 rounded-2xl border border-border shadow-sm bg-white animate-in slide-in-from-bottom-2 duration-300 fill-mode-both`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-sm font-medium text-foreground leading-relaxed pt-2">
                  {text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
