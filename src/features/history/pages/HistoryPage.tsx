import { Map, AlertTriangle, Calendar, ChevronRight } from 'lucide-react';
import { riskColor } from '@/lib/utils';
import { MOCK_HISTORY } from '@/constants';
import { useIsMobile } from '@/hooks/useIsMobile';

export function HistoryPage() {
  const isMobile = useIsMobile();

  const cards = MOCK_HISTORY.map((item) => {
    const rc = riskColor(item.risk);
    return (
      <div key={item.id} className="bg-white rounded-2xl p-4 border border-border shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full text-white ${rc.badge}`}>{rc.label}</span>
            <p className="font-bold text-foreground text-base mt-1">{item.crop}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {item.date}
          </div>
        </div>
        <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Map className="w-3.5 h-3.5" />
            <span>{item.area}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{item.problem}</span>
          </div>
        </div>
        <button className="w-full border border-green-200 text-green-700 text-sm font-semibold py-2.5 rounded-xl hover:bg-green-50 transition-colors flex items-center justify-center gap-2">
          Batafsil ko'rish
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  });

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
