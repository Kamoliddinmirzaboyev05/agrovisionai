import { useState, useEffect } from 'react';
import { Map, AlertTriangle, Calendar, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { riskColor } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';

interface HistoryResult {
  id: number;
  created_at: string;
  name: string;
  center_lat: number;
  center_lng: number;
  area_ha: number;
  ndvi_current: number | null;
  ndwi_current: number | null;
  ndvi_change: number | null;
  drought_index: number | null;
  ndvi_label: string;
}

interface HistoryResponse {
  count: number;
  results: HistoryResult[];
}

export function HistoryPage() {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryResult[]>([]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:8000/api/satellite/history/');
      if (!response.ok) throw new Error('Ma\'lumotlarni yuklashda xatolik yuz berdi');
      const data: HistoryResponse = await response.json();
      setHistory(data.results);
    } catch (err: any) {
      setError(err.message || 'Kutilmagan xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatArea = (ha: number) => {
    if (ha >= 1) return `${ha.toFixed(2)} gektar`;
    return `${(ha * 100).toFixed(1)} sotix`;
  };

  const getRiskFromNDVI = (ndvi: number | null) => {
    if (ndvi === null) return 'low';
    if (ndvi < 0.2) return 'high';
    if (ndvi < 0.5) return 'medium';
    return 'low';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
        <p className="text-sm text-muted-foreground">Tarix yuklanmoqda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Xatolik yuz berdi</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <button
          onClick={fetchHistory}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all active:scale-95"
        >
          <RefreshCw className="w-4 h-4" /> Qayta urinish
        </button>
      </div>
    );
  }

  const cards = history.map((item) => {
    const risk = getRiskFromNDVI(item.ndvi_current);
    const rc = riskColor(risk as any);
    return (
      <div key={item.id} className="bg-white rounded-2xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white ${rc.badge}`}>{rc.label}</span>
            <p className="font-bold text-foreground text-base mt-1 capitalize">{item.name || 'Nomsiz dala'}</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(item.created_at)}
          </div>
        </div>
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Map className="w-3.5 h-3.5 text-blue-500" />
            <span>{formatArea(item.area_ha)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="truncate max-w-[120px]">{item.ndvi_label}</span>
          </div>
        </div>
        <button className="w-full border border-green-200 text-green-700 text-xs font-bold py-3 rounded-xl hover:bg-green-50 transition-colors flex items-center justify-center gap-2">
          Batafsil ko'rish
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  });

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 opacity-60">
        <Map className="w-12 h-12 text-gray-300" />
        <p className="text-sm font-medium">Hali tahlillar mavjud emas</p>
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto w-full">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tahlil Tarixi</h2>
          <p className="text-sm text-muted-foreground mt-1">Barcha o'tgan tahlillar</p>
        </div>
        <div className="grid grid-cols-2 gap-4">{cards}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-4 pt-5">
      <h2 className="text-xl font-bold text-foreground mb-1">Tahlil Tarixi</h2>
      <p className="text-sm text-muted-foreground mb-5">Oldingi tahlillar</p>
      <div className="flex flex-col gap-3 overflow-y-auto pb-4">{cards}</div>
    </div>
  );
}
