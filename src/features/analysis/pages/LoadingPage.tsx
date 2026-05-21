import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Leaf, CheckCircle } from 'lucide-react';
import { LOADING_STEPS } from '@/constants';
import { ROUTES } from '@/router/routes';

export function LoadingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < LOADING_STEPS.length; i++) {
        await new Promise((r) => setTimeout(r, 900));
        if (cancelled) return;
        setStep(i + 1);
      }
      await new Promise((r) => setTimeout(r, 400));
      if (cancelled) return;
      setDone(true);
      setTimeout(() => navigate(ROUTES.RESULT, { replace: true }), 600);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

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
