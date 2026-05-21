import { useRef } from 'react';
import { useNavigate } from 'react-router';
import { Upload, Activity, Info } from 'lucide-react';
import { UploadZone } from '../components/UploadZone';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ROUTES } from '@/router/routes';

export function UploadPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = () => navigate(ROUTES.LOADING);

  const tipsBox = (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p className="text-sm font-semibold text-amber-700">Maslahatlar</p>
      </div>
      <p className="text-xs text-amber-800">• Barg yoki mevaning zararlangan joyini yaqinroq va tiniq suratga oling.</p>
      <p className="text-xs text-amber-800">• Juda qorong'i yoki xira rasm yuklamang.</p>
    </div>
  );

  if (!isMobile) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto w-full">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Rasm Yuklash</h2>
          <p className="text-sm text-muted-foreground mt-1">Ekin bargini yoki mevani suratga oling va tahlil qiling</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <UploadZone isDesktop />
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full border-2 border-primary text-primary font-bold py-3.5 rounded-2xl hover:bg-green-50 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Rasm yuklash
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {tipsBox}
            <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-3">
              <h3 className="font-bold text-foreground text-sm">Tahlil jarayoni</h3>
              {[
                'Dala maydoni hisoblanadi',
                "Sun'iy yo'ldosh ma'lumotlari olinadi",
                'Ob-havo tahlil qilinadi',
                'Rasm AI model orqali tekshiriladi',
                'Yakuniy tavsiya tayyorlanadi',
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-sm text-muted-foreground">{s}</p>
                </div>
              ))}
            </div>
            <button
              onClick={handleAnalyze}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-base"
            >
              <Activity className="w-5 h-5" />
              Tahlil qilish
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mobile
  return (
    <div className="flex flex-col h-full px-5 pt-5">
      <h2 className="text-xl font-bold text-foreground">Rasm Yuklash</h2>
      <p className="text-sm text-muted-foreground mb-5">Ekin bargini yoki mevani suratga oling</p>
      <UploadZone />
      <div className="mt-5">{tipsBox}</div>
      <div className="mt-5 mb-2 flex flex-col gap-3">
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-primary text-primary font-bold py-3.5 rounded-2xl hover:bg-green-50 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Rasm yuklash
        </button>
        <button
          onClick={handleAnalyze}
          className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-base"
        >
          <Activity className="w-5 h-5" />
          Tahlil qilish
        </button>
      </div>
    </div>
  );
}
