import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Leaf, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { LOADING_STEPS } from '@/constants';
import { ROUTES } from '@/router/routes';
import type { FieldData } from '@/types';

export function LoadingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const raw = sessionStorage.getItem('fieldData');
        if (!raw) throw new Error("Dala ma'lumotlari topilmadi. Iltimos, qaytadan urinib ko'ring.");
        
        const fieldData: FieldData = JSON.parse(raw);
        
        // Backend payload format based on user requirement
        const payload = {
          coordinates: fieldData.points,
          area_ha: fieldData.area_ha || 0,
          save: false,
          name: fieldData.name || fieldData.crop || 'Dala'
        };

        // Step 1: Initializing
        setStep(1);
        await new Promise((r) => setTimeout(r, 1000));
        if (cancelled) return;

        // Step 2: Satellite data (Real API call)
        setStep(2);
        const response = await fetch('http://localhost:8000/api/satellite/analyze/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Backend server bilan bog'lanishda xatolik yuz berdi.");
        }

        const result = await response.json();
        if (cancelled) return;

        // Step 3: Satellite Data Analysis
        setStep(3);
        await new Promise((r) => setTimeout(r, 1200));
        if (cancelled) return;

        // Step 4: AI Model Interpretation
        setStep(4);
        await new Promise((r) => setTimeout(r, 1200));
        if (cancelled) return;

        // Step 5: Finalizing Results
        setStep(5);
        await new Promise((r) => setTimeout(r, 1000));
        if (cancelled) return;

        // Store result for ResultPage
        sessionStorage.setItem('analysisResult', JSON.stringify(result));
        
        setDone(true);
        setTimeout(() => {
          if (!cancelled) navigate(ROUTES.RESULT, { replace: true });
        }, 800);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Tahlil jarayonida kutilmagan xatolik yuz berdi.");
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground mb-2">Xatolik yuz berdi</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">{error}</p>
        </div>
        <div className="flex flex-col w-full max-w-xs gap-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" /> Qayta urinish
          </button>
          <button
            onClick={() => navigate(ROUTES.FIELD)}
            className="w-full bg-white text-gray-700 font-bold py-4 rounded-2xl border border-border hover:bg-gray-50 active:scale-95 transition-all"
          >
            Xaritaga qaytish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-8">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
          <Leaf className="w-12 h-12 text-green-600 animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-green-400 border-t-transparent animate-spin" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Tahlil jarayoni</h2>
        <p className="text-sm text-muted-foreground">Iltimos kuting...</p>
      </div>
      <div className="w-full max-w-xs flex flex-col gap-3">
        {LOADING_STEPS.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${
              i < step ? 'bg-green-50' : 'bg-gray-50 opacity-40'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                i < step ? 'bg-green-500' : 'bg-gray-200'
              }`}
            >
              {i < step ? (
                <CheckCircle className="w-4 h-4 text-white" />
              ) : (
                <span className="text-xs text-gray-400 font-bold">{i + 1}</span>
              )}
            </div>
            <p className={`text-sm font-medium text-left ${i < step ? 'text-green-700' : 'text-gray-400'}`}>{s}</p>
          </div>
        ))}
      </div>
      {done && (
        <div className="flex items-center gap-2 text-green-600 font-bold">
          <CheckCircle className="w-5 h-5" />
          Tahlil tugadi!
        </div>
      )}
    </div>
  );
}
