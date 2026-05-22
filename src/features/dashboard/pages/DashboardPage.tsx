import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Leaf,
  Eye,
  Droplets,
  Brain,
  ArrowRight,
  TrendingUp,
  Sprout,
  CloudRain,
  Calendar,
  Loader2,
  Crown,
} from "lucide-react";
import { StatsCard } from "../components/StatsCard";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { riskColor } from "@/lib/utils";
import { ROUTES } from "@/router/routes";

interface HistoryResult {
  id: number;
  created_at: string;
  name: string;
  ndvi_current: number | null;
  ndvi_label: string;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryResult[]>([]);
  const [loading, setLoading] = useState(true);

  const currentPlan = user?.plan || "Bepul";

  useEffect(() => {
    fetch("/api/satellite/history/", { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setHistory(data.results || []);
      })
      .catch((err) => console.error("History fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
    } catch {
      return dateStr;
    }
  };

  const getRiskFromNDVI = (ndvi: number | null) => {
    if (ndvi === null) return "low";
    if (ndvi < 0.2) return "high";
    if (ndvi < 0.5) return "medium";
    return "low";
  };

  const features = [
    {
      icon: Eye,
      label: "Kasallikni aniqlash",
      color: "bg-red-100 text-red-700",
      desc: "AI orqali tekshiring",
    },
    {
      icon: Droplets,
      label: "Aqlli sug'orish",
      color: "bg-blue-100 text-blue-700",
      desc: "Tavsiya oling",
    },
    {
      icon: Brain,
      label: "AI tavsiya",
      color: "bg-purple-100 text-purple-700",
      desc: "Zudlik bilan",
    },
  ];

  const handleStart = () => navigate(ROUTES.FIELD);

  if (!isMobile) {
    return (
      <div className="flex flex-col gap-8 p-8 max-w-4xl mx-auto w-full">
        {/* Hero */}
        <div className="bg-primary rounded-3xl p-10 text-white flex items-center gap-8 shadow-xl">
          <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-2xl backdrop-blur-sm">
            <Leaf className="w-12 h-12 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-extrabold mb-2 tracking-tight">
              AgroVision AI
            </h1>
            <p className="text-white/80 text-lg font-medium mb-2">
              Sun'iy yo'ldosh, AI va ob-havo asosida aqlli fermer yordamchisi
            </p>
            <p className="text-white/60 text-sm leading-relaxed max-w-lg">
              Dala maydonini belgilang, ekin rasmini yuklang va kasallik, suv
              hamda parvarish bo'yicha tavsiya oling.
            </p>
          </div>
          <button
            onClick={handleStart}
            className="flex-shrink-0 bg-white text-primary font-bold text-base px-8 py-4 rounded-2xl shadow-xl hover:bg-gray-50 active:scale-95 transition-all flex items-center gap-3"
          >
            Tahlilni boshlash
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Upgrade Banner */}
        {currentPlan === "Bepul" && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-6 text-white flex items-center justify-between shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Crown className="w-24 h-24 rotate-12" />
            </div>
            <div className="relative z-10 flex items-center gap-6">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Max tarifga o'ting!</h3>
                <p className="text-white/80 text-xs font-medium">Cheksiz dalalar va AI rasm tahlili imkoniyatiga ega bo'ling.</p>
              </div>
            </div>
            <button 
              onClick={() => navigate(ROUTES.PRICING)}
              className="relative z-10 bg-white text-orange-600 font-black text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-xl hover:bg-gray-50 active:scale-95 transition-all"
            >
              Yangilash
            </button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <StatsCard
            icon={TrendingUp}
            label="Jami tahlillar"
            value={loading ? "..." : history.length.toString()}
            color="text-green-600"
            bg="bg-green-50"
          />
          <StatsCard
            icon={Sprout}
            label="Faol dalalar"
            value={loading ? "..." : Array.from(new Set(history.map(h => h.name))).length.toString()}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <StatsCard
            icon={CloudRain}
            label="Sug'orish kerak"
            value={loading ? "..." : history.filter(h => (h.ndvi_current || 1) < 0.4).length.toString()}
            color="text-amber-600"
            bg="bg-amber-50"
          />
        </div>

        {/* Features grid */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Xizmatlar</h2>
          <div className="grid grid-cols-3 gap-4">
            {features.map(({ icon: Icon, label, color, desc }) => (
              <div
                key={label}
                className="bg-white rounded-2xl p-5 flex flex-col gap-3 border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <p className="font-bold text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent history preview */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">
            So'nggi tahlillar
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground">Tahlillar hali yo'q</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {history.slice(0, 2).map((item) => {
                const risk = getRiskFromNDVI(item.ndvi_current);
                const rc = riskColor(risk as any);
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-5 border border-border shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(ROUTES.HISTORY)}
                  >
                    <div
                      className={`w-10 h-10 ${rc.light} rounded-xl flex items-center justify-center flex-shrink-0`}
                    >
                      <Leaf className={`w-5 h-5 ${rc.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-sm truncate capitalize">
                        {item.name || "Dala"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.ndvi_label} • {formatDate(item.created_at)}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white flex-shrink-0 ${rc.badge}`}
                    >
                      {rc.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mobile version
  return (
    <div className="min-h-screen bg-primary flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-center">
        <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-6 shadow-2xl backdrop-blur-sm">
          <Leaf className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
          AgroVision AI
        </h1>
        <p className="text-white/80 text-base font-medium mb-4 leading-snug max-w-xs">
          Sun'iy yo'ldosh, AI va ob-havo asosida aqlli fermer yordamchisi
        </p>
        <p className="text-white/60 text-sm leading-relaxed max-w-sm mb-10">
          Dala maydonini belgilang, ekin rasmini yuklang va kasallik, suv hamda
          parvarish bo'yicha tavsiya oling.
        </p>

        {currentPlan === "Bepul" && (
          <div 
            onClick={() => navigate(ROUTES.PRICING)}
            className="w-full bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-5 mb-6 text-white text-left flex items-center gap-4 shadow-xl active:scale-95 transition-all"
          >
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-black tracking-tight">Max tarifga o'ting!</p>
              <p className="text-[10px] text-white/80 font-medium leading-tight">Barcha cheklovlarni olib tashlang</p>
            </div>
            <ArrowRight className="w-4 h-4 ml-auto opacity-60" />
          </div>
        )}

        <button
          onClick={handleStart}
          className="w-full max-w-xs bg-white text-primary font-bold text-lg py-4 rounded-2xl shadow-xl hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          Tahlilni boshlash
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
      <div className="bg-white rounded-t-[2rem] px-5 pt-8 pb-6 shadow-2xl">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 text-center">
          Xizmatlar
        </p>
        <div className="grid grid-cols-2 gap-3">
          {features.map(({ icon: Icon, label, color, desc }) => (
            <div
              key={label}
              className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2 border border-border"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <p className="font-semibold text-sm text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
