import { useState, useEffect, useRef, useCallback } from "react";
import {
  Home,
  Map,
  BarChart3,
  User,
  Leaf,
  Droplets,
  Brain,
  ChevronRight,
  Upload,
  X,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  MapPin,
  Trash2,
  Calendar,
  ArrowRight,
  Camera,
  Info,
  Bell,
  HelpCircle,
  Globe,
  ChevronDown,
  Thermometer,
  Eye,
  Activity,
  Star,
  Navigation,
  Menu,
  TrendingUp,
  CloudRain,
  Sprout,
  LayoutDashboard,
  ChevronLeft,
  Settings,
  LogOut,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Types ──────────────────────────────────────────────────────────────────────

type Screen = "landing" | "field" | "upload" | "loading" | "result" | "history" | "profile";
type NavTab = "home" | "field" | "results" | "profile";
type RiskLevel = "low" | "medium" | "high";

interface LatLng { lat: number; lng: number }

interface HistoryItem {
  id: string;
  date: string;
  crop: string;
  area: string;
  risk: RiskLevel;
  problem: string;
}

// ── Mock API ───────────────────────────────────────────────────────────────────

const mockHistory: HistoryItem[] = [
  { id: "1", date: "18 May 2025", crop: "Pomidor", area: "25 sotix", risk: "medium", problem: "Shira ehtimoli" },
  { id: "2", date: "10 May 2025", crop: "Bodring", area: "12 sotix", risk: "low", problem: "Sog'lom holat" },
  { id: "3", date: "2 May 2025", crop: "Paxta", area: "3 gektar", risk: "high", problem: "Zang kasalligi" },
  { id: "4", date: "25 Apr 2025", crop: "Bug'doy", area: "5 gektar", risk: "low", problem: "Sog'lom holat" },
];

// ── Utilities ──────────────────────────────────────────────────────────────────

function calcArea(points: LatLng[]): { m2: number; sotix: number; hectare: number } {
  if (points.length < 3) return { m2: 0, sotix: 0, hectare: 0 };
  let area = 0;
  const n = points.length;
  const R = 6371000;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = (points[i].lat * Math.PI) / 180;
    const lat2 = (points[j].lat * Math.PI) / 180;
    const lng1 = (points[i].lng * Math.PI) / 180;
    const lng2 = (points[j].lng * Math.PI) / 180;
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  const m2 = Math.abs((area * R * R) / 2);
  return { m2: Math.round(m2), sotix: Math.round(m2 / 100), hectare: Math.round((m2 / 10000) * 100) / 100 };
}

function riskColor(risk: RiskLevel) {
  if (risk === "low") return { badge: "bg-green-500", label: "Xavf past", text: "text-green-700", light: "bg-green-50" };
  if (risk === "medium") return { badge: "bg-amber-500", label: "O'rtacha xavf", text: "text-amber-700", light: "bg-amber-50" };
  return { badge: "bg-red-500", label: "Yuqori xavf", text: "text-red-700", light: "bg-red-50" };
}

// ── useIsMobile hook ───────────────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// ── Vanilla Leaflet Map ────────────────────────────────────────────────────────

interface LeafletMapProps {
  drawing: boolean;
  points: LatLng[];
  onAddPoint: (p: LatLng) => void;
  onLocate: (p: LatLng) => void;
}

function LeafletMap({ drawing, points, onAddPoint, onLocate }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const drawingRef = useRef(drawing);

  useEffect(() => { drawingRef.current = drawing; }, [drawing]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [41.2995, 69.2401], zoom: 13, zoomControl: true });
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "Tiles © Esri" }).addTo(map);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { attribution: "" }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (drawingRef.current) onAddPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m: L.Marker) => m.remove());
    markersRef.current = [];
    if (polygonRef.current) { polygonRef.current.remove(); polygonRef.current = null; }
    points.forEach(p => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:10px;height:10px;background:#1a8c3e;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        iconAnchor: [5, 5],
      });
      markersRef.current.push(L.marker([p.lat, p.lng], { icon }).addTo(map));
    });
    if (points.length >= 3) {
      polygonRef.current = L.polygon(
        points.map(p => [p.lat, p.lng] as [number, number]),
        { color: "#1a8c3e", fillColor: "#2db54b", fillOpacity: 0.25, weight: 2.5 }
      ).addTo(map);
    }
  }, [points]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.style.cursor = drawing ? "crosshair" : "";
  }, [drawing]);

  const handleLocate = () => {
    const map = mapRef.current;
    if (!map) return;
    map.locate({ setView: true, maxZoom: 17 });
    map.once("locationfound", (e: L.LocationEvent) => onLocate({ lat: e.latlng.lat, lng: e.latlng.lng }));
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <button
        onClick={handleLocate}
        className="absolute top-3 right-3 z-[1000] bg-white rounded-xl shadow-lg p-2.5 hover:bg-green-50 transition-colors border border-green-100"
        title="Joylashuvimni topish"
      >
        <Navigation className="w-5 h-5 text-green-700" />
      </button>
    </div>
  );
}

// ── Landing Screen ─────────────────────────────────────────────────────────────

function LandingScreen({ onStart, isDesktop }: { onStart: () => void; isDesktop?: boolean }) {
  const features = [
    { icon: Map, label: "Dala tahlili", color: "bg-green-100 text-green-700", desc: "Maydonni chizing" },
    { icon: Eye, label: "Kasallikni aniqlash", color: "bg-red-100 text-red-700", desc: "AI orqali tekshiring" },
    { icon: Droplets, label: "Aqlli sug'orish", color: "bg-blue-100 text-blue-700", desc: "Tavsiya oling" },
    { icon: Brain, label: "AI tavsiya", color: "bg-purple-100 text-purple-700", desc: "Zudlik bilan" },
  ];

  if (isDesktop) {
    return (
      <div className="flex flex-col gap-8 p-8 max-w-4xl mx-auto w-full">
        {/* Hero */}
        <div className="bg-gradient-to-r from-green-700 to-green-500 rounded-3xl p-10 text-white flex items-center gap-8 shadow-xl">
          <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center flex-shrink-0 shadow-2xl backdrop-blur-sm">
            <Leaf className="w-12 h-12 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-extrabold mb-2 tracking-tight">AgroVision AI</h1>
            <p className="text-green-100 text-lg font-medium mb-2">Sun'iy yo'ldosh, AI va ob-havo asosida aqlli fermer yordamchisi</p>
            <p className="text-green-200 text-sm leading-relaxed max-w-lg">
              Dala maydonini belgilang, ekin rasmini yuklang va kasallik, suv hamda parvarish bo'yicha tavsiya oling.
            </p>
          </div>
          <button
            onClick={onStart}
            className="flex-shrink-0 bg-white text-green-700 font-bold text-base px-8 py-4 rounded-2xl shadow-xl hover:bg-green-50 active:scale-95 transition-all flex items-center gap-3"
          >
            Tahlilni boshlash
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: TrendingUp, label: "Jami tahlillar", value: "4", color: "text-green-600", bg: "bg-green-50" },
            { icon: Sprout, label: "Faol dalalar", value: "3", color: "text-blue-600", bg: "bg-blue-50" },
            { icon: CloudRain, label: "Sug'orish kerak", value: "1", color: "text-amber-600", bg: "bg-amber-50" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl p-6 border border-border shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-foreground">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Features grid */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Xizmatlar</h2>
          <div className="grid grid-cols-4 gap-4">
            {features.map(({ icon: Icon, label, color, desc }) => (
              <div key={label} className="bg-white rounded-2xl p-5 flex flex-col gap-3 border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
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
          <h2 className="text-lg font-bold text-foreground mb-4">So'nggi tahlillar</h2>
          <div className="grid grid-cols-2 gap-4">
            {mockHistory.slice(0, 2).map((item) => {
              const rc = riskColor(item.risk);
              return (
                <div key={item.id} className="bg-white rounded-2xl p-5 border border-border shadow-sm flex items-center gap-4">
                  <div className={`w-10 h-10 ${rc.light} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Leaf className={`w-5 h-5 ${rc.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm">{item.crop}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.problem} • {item.date}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full text-white flex-shrink-0 ${rc.badge}`}>{rc.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Mobile version
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-700 via-green-600 to-green-500 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-center">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-6 shadow-2xl backdrop-blur-sm">
          <Leaf className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">AgroVision AI</h1>
        <p className="text-green-100 text-base font-medium mb-4 leading-snug max-w-xs">
          Sun'iy yo'ldosh, AI va ob-havo asosida aqlli fermer yordamchisi
        </p>
        <p className="text-green-200 text-sm leading-relaxed max-w-sm mb-10">
          Dala maydonini belgilang, ekin rasmini yuklang va kasallik, suv hamda parvarish bo'yicha tavsiya oling.
        </p>
        <button
          onClick={onStart}
          className="w-full max-w-xs bg-white text-green-700 font-bold text-lg py-4 rounded-2xl shadow-xl hover:bg-green-50 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          Tahlilni boshlash
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
      <div className="bg-white rounded-t-[2rem] px-5 pt-8 pb-6 shadow-2xl">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 text-center">Xizmatlar</p>
        <div className="grid grid-cols-2 gap-3">
          {features.map(({ icon: Icon, label, color, desc }) => (
            <div key={label} className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2 border border-border">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
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

// ── Field Mapping Screen ───────────────────────────────────────────────────────

const CROPS = ["Pomidor", "Bodring", "Kartoshka", "Uzum", "Paxta", "Bug'doy", "Piyoz", "Olma", "Boshqa"];

function FieldScreen({ onNext, isDesktop }: { onNext: (data: { points: LatLng[]; crop: string }) => void; isDesktop?: boolean }) {
  const [points, setPoints] = useState<LatLng[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [crop, setCrop] = useState("Pomidor");
  const [lastIrrigation, setLastIrrigation] = useState("");
  const [waterCycle, setWaterCycle] = useState("7");
  const area = calcArea(points);

  const handleAddPoint = useCallback((p: LatLng) => setPoints((prev: LatLng[]) => [...prev, p]), []);
  const handleLocate = useCallback((p: LatLng) => setPoints((prev: LatLng[]) => [...prev, p]), []);
  const clear = () => { setPoints([]); setDrawing(false); };

  const mapHeight = isDesktop ? 420 : 280;

  const formSection = (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-semibold text-foreground mb-1.5 block">Ekin turi</label>
        <div className="relative">
          <select
            value={crop}
            onChange={e => setCrop(e.target.value)}
            className="w-full bg-input-background border border-border rounded-xl px-4 py-3 text-foreground appearance-none font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {CROPS.map(c => <option key={c}>{c}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">So'nggi sug'orish</label>
          <input
            type="date"
            value={lastIrrigation}
            onChange={e => setLastIrrigation(e.target.value)}
            className="w-full bg-input-background border border-border rounded-xl px-3 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Davr (kun)</label>
          <input
            type="number"
            value={waterCycle}
            onChange={e => setWaterCycle(e.target.value)}
            className="w-full bg-input-background border border-border rounded-xl px-3 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            min={1} max={30}
          />
        </div>
      </div>
      <button
        onClick={() => onNext({ points, crop })}
        className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-base mt-2"
      >
        Keyingi bosqich
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );

  if (isDesktop) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-6xl mx-auto w-full">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dala Xaritasi</h2>
          <p className="text-sm text-muted-foreground mt-1">Maydoningizni xaritada belgilang va ekin ma'lumotlarini kiriting</p>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {/* Map — takes 2 cols */}
          <div className="col-span-2 flex flex-col gap-4">
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-border" style={{ height: mapHeight }}>
              <LeafletMap drawing={drawing} points={points} onAddPoint={handleAddPoint} onLocate={handleLocate} />
              {drawing && (
                <div className="absolute top-3 left-3 z-[1000] bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow pointer-events-none">
                  Xaritaga bosing • {points.length} nuqta
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDrawing((d: boolean) => !d)}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${drawing ? "bg-green-600 text-white shadow-lg" : "bg-green-100 text-green-700"}`}
              >
                <Map className="w-4 h-4" />
                {drawing ? "Chizishni to'xtatish" : "Maydonni chizish"}
              </button>
              <button onClick={clear} className="p-3 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            {area.m2 > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-4 justify-around">
                <div className="text-center"><p className="text-xs text-muted-foreground">m²</p><p className="font-bold text-green-700">{area.m2.toLocaleString()}</p></div>
                <div className="w-px bg-green-200" />
                <div className="text-center"><p className="text-xs text-muted-foreground">Sotix</p><p className="font-bold text-green-700">{area.sotix}</p></div>
                <div className="w-px bg-green-200" />
                <div className="text-center"><p className="text-xs text-muted-foreground">Gektar</p><p className="font-bold text-green-700">{area.hectare}</p></div>
              </div>
            )}
          </div>
          {/* Form — 1 col */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4 h-fit">
            <h3 className="font-bold text-foreground">Ekin ma'lumotlari</h3>
            {formSection}
          </div>
        </div>
      </div>
    );
  }

  // Mobile
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-xl font-bold text-foreground">Dala Xaritasi</h2>
        <p className="text-sm text-muted-foreground">Maydoningizni xaritada belgilang</p>
      </div>
      <div className="relative flex-shrink-0 mx-4 rounded-2xl overflow-hidden shadow-lg border border-border" style={{ height: mapHeight }}>
        <LeafletMap drawing={drawing} points={points} onAddPoint={handleAddPoint} onLocate={handleLocate} />
        {drawing && (
          <div className="absolute top-3 left-3 z-[1000] bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow pointer-events-none">
            Xaritaga bosing • {points.length} nuqta
          </div>
        )}
      </div>
      <div className="px-4 mt-3 flex gap-2">
        <button
          onClick={() => setDrawing((d: boolean) => !d)}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${drawing ? "bg-green-600 text-white shadow-lg" : "bg-green-100 text-green-700"}`}
        >
          <Map className="w-4 h-4" />
          {drawing ? "Chizishni to'xtatish" : "Maydonni chizish"}
        </button>
        <button onClick={clear} className="p-3 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      {area.m2 > 0 && (
        <div className="mx-4 mt-3 bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-4 justify-around">
          <div className="text-center"><p className="text-xs text-muted-foreground">m²</p><p className="font-bold text-green-700">{area.m2.toLocaleString()}</p></div>
          <div className="w-px bg-green-200" />
          <div className="text-center"><p className="text-xs text-muted-foreground">Sotix</p><p className="font-bold text-green-700">{area.sotix}</p></div>
          <div className="w-px bg-green-200" />
          <div className="text-center"><p className="text-xs text-muted-foreground">Gektar</p><p className="font-bold text-green-700">{area.hectare}</p></div>
        </div>
      )}
      <div className="px-4 mt-4 flex flex-col gap-3">{formSection}</div>
      <div className="h-4" />
    </div>
  );
}

// ── Image Upload Screen ────────────────────────────────────────────────────────

function UploadScreen({ onAnalyze, isDesktop }: { onAnalyze: () => void; isDesktop?: boolean }) {
  const [image, setImage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => setImage(URL.createObjectURL(f));
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };

  const uploadZone = (
    <div
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      onClick={() => !image && inputRef.current?.click()}
      className="relative rounded-3xl border-2 border-dashed border-green-300 bg-green-50 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-green-500 hover:bg-green-100 transition-all"
      style={{ minHeight: isDesktop ? 320 : 240 }}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      {image ? (
        <>
          <img src={image} alt="Yuklangan rasm" className="w-full object-cover" style={{ minHeight: isDesktop ? 320 : 240, maxHeight: isDesktop ? 400 : 280 }} />
          <button onClick={e => { e.stopPropagation(); setImage(null); }} className="absolute top-3 right-3 bg-white/90 rounded-full p-1.5 shadow hover:bg-red-50">
            <X className="w-4 h-4 text-red-500" />
          </button>
          <div className="absolute bottom-3 left-3 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">✓ Rasm tanlandi</div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 p-8">
          <div className="w-16 h-16 bg-green-200 rounded-2xl flex items-center justify-center">
            <Camera className="w-8 h-8 text-green-600" />
          </div>
          <p className="font-bold text-green-700 text-base">Rasm yuklash</p>
          <p className="text-xs text-muted-foreground text-center">JPG yoki PNG • Bosing yoki suring</p>
        </div>
      )}
    </div>
  );

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

  if (isDesktop) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto w-full">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Rasm Yuklash</h2>
          <p className="text-sm text-muted-foreground mt-1">Ekin bargini yoki mevani suratga oling va tahlil qiling</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            {uploadZone}
            <button onClick={() => inputRef.current?.click()} className="w-full border-2 border-primary text-primary font-bold py-3.5 rounded-2xl hover:bg-green-50 active:scale-95 transition-all flex items-center justify-center gap-2">
              <Upload className="w-5 h-5" />
              Rasm yuklash
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {tipsBox}
            <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-3">
              <h3 className="font-bold text-foreground text-sm">Tahlil jarayoni</h3>
              {["Dala maydoni hisoblanadi", "Sun'iy yo'ldosh ma'lumotlari olinadi", "Ob-havo tahlil qilinadi", "Rasm AI model orqali tekshiriladi", "Yakuniy tavsiya tayyorlanadi"].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                  <p className="text-sm text-muted-foreground">{s}</p>
                </div>
              ))}
            </div>
            <button onClick={onAnalyze} className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-base">
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
      {uploadZone}
      <div className="mt-5">{tipsBox}</div>
      <div className="mt-5 mb-2 flex flex-col gap-3">
        <button onClick={() => inputRef.current?.click()} className="w-full border-2 border-primary text-primary font-bold py-3.5 rounded-2xl hover:bg-green-50 active:scale-95 transition-all flex items-center justify-center gap-2">
          <Upload className="w-5 h-5" />
          Rasm yuklash
        </button>
        <button onClick={onAnalyze} className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-base">
          <Activity className="w-5 h-5" />
          Tahlil qilish
        </button>
      </div>
    </div>
  );
}

// ── Loading Screen ─────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  "Dala maydoni hisoblanmoqda...",
  "Sun'iy yo'ldosh ma'lumotlari olinmoqda...",
  "Ob-havo tahlil qilinmoqda...",
  "Rasm AI model orqali tekshirilmoqda...",
  "Yakuniy tavsiya tayyorlanmoqda...",
];

function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < LOADING_STEPS.length; i++) {
        await new Promise(r => setTimeout(r, 900));
        if (cancelled) return;
        setStep(i + 1);
      }
      await new Promise(r => setTimeout(r, 400));
      if (cancelled) return;
      setDone(true);
      setTimeout(onDone, 600);
    };
    run();
    return () => { cancelled = true; };
  }, [onDone]);

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
          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${i < step ? "bg-green-50" : "bg-gray-50 opacity-40"}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${i < step ? "bg-green-500" : "bg-gray-200"}`}>
              {i < step ? <CheckCircle className="w-4 h-4 text-white" /> : <span className="text-xs text-gray-400 font-bold">{i + 1}</span>}
            </div>
            <p className={`text-sm font-medium text-left ${i < step ? "text-green-700" : "text-gray-400"}`}>{s}</p>
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

// ── Result Dashboard ───────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, color, bg, wide }: {
  icon: React.ElementType; label: string; value: string; color: string; bg: string; wide?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl p-4 border border-border shadow-sm ${wide ? "col-span-2" : ""}`}>
      <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-extrabold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function ResultScreen({ crop, area, isDesktop }: { crop: string; area: string; isDesktop?: boolean }) {
  const [tab, setTab] = useState<"overview" | "recommendations">("overview");

  const recommendations = [
    { icon: AlertTriangle, text: "Shiraga qarshi dori ishlatish tavsiya etiladi", color: "text-red-600", bg: "bg-red-50" },
    { icon: Eye, text: "Barg ostini tekshiring", color: "text-amber-600", bg: "bg-amber-50" },
    { icon: Leaf, text: "Zararlangan barglarni ajrating", color: "text-orange-600", bg: "bg-orange-50" },
    { icon: Droplets, text: "Kechki payt sug'oring", color: "text-blue-600", bg: "bg-blue-50" },
    { icon: Star, text: "Kunduzi sug'orishdan saqlaning", color: "text-amber-600", bg: "bg-amber-50" },
    { icon: Info, text: "Dorini ishlatishdan oldin yorliqdagi me'yorni tekshiring", color: "text-green-600", bg: "bg-green-50" },
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
      <MetricCard icon={Map} label="Maydon" value={area || "25 sotix"} color="text-blue-600" bg="bg-blue-50" />
      <MetricCard icon={AlertTriangle} label="Kasallik" value="Shira ehtimoli" color="text-red-600" bg="bg-red-50" />
      <MetricCard icon={Activity} label="Ishonch" value="82%" color="text-purple-600" bg="bg-purple-50" />
      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
            <Star className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">O'simlik holati (NDVI)</p>
        </div>
        <div className="flex items-end gap-2 mb-2">
          <p className="text-2xl font-extrabold text-foreground">0.56</p>
          <p className="text-sm text-amber-600 font-semibold mb-1">O'rtacha</p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-red-400 via-amber-400 to-green-500" style={{ width: "56%" }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>Yomon</span><span>Yaxshi</span></div>
      </div>
      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center mb-2"><Droplets className="w-4 h-4 text-blue-600" /></div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Yer namligi</p>
        <p className="text-lg font-extrabold text-red-600 mt-1">Past</p>
      </div>
      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
        <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center mb-2"><Thermometer className="w-4 h-4 text-orange-600" /></div>
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

  if (isDesktop) {
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
        <button onClick={() => setTab("overview")} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === "overview" ? "bg-white text-green-700 shadow" : "text-muted-foreground"}`}>Ko'rsatkichlar</button>
        <button onClick={() => setTab("recommendations")} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === "recommendations" ? "bg-white text-green-700 shadow" : "text-muted-foreground"}`}>Tavsiyalar</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 mt-4 pb-4">
        {tab === "overview" ? metricsGrid : recsList}
      </div>
    </div>
  );
}

// ── History Screen ─────────────────────────────────────────────────────────────

function HistoryScreen({ isDesktop }: { isDesktop?: boolean }) {
  const cards = mockHistory.map((item) => {
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
          <div className="flex items-center gap-1.5"><Map className="w-3.5 h-3.5" /><span>{item.area}</span></div>
          <div className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /><span>{item.problem}</span></div>
        </div>
        <button className="w-full border border-green-200 text-green-700 text-sm font-semibold py-2.5 rounded-xl hover:bg-green-50 transition-colors flex items-center justify-center gap-2">
          Batafsil ko'rish
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  });

  if (isDesktop) {
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

// ── Profile Screen ─────────────────────────────────────────────────────────────

function ProfileScreen({ isDesktop }: { isDesktop?: boolean }) {
  const [notifications, setNotifications] = useState(true);

  const settingsCard = (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
        <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center"><Globe className="w-4 h-4 text-green-600" /></div>
        <div className="flex-1"><p className="text-sm font-semibold text-foreground">Til</p><p className="text-xs text-muted-foreground">O'zbek tili</p></div>
        <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">UZ</span>
      </div>
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center"><MapPin className="w-4 h-4 text-blue-600" /></div>
        <div className="flex-1"><p className="text-sm font-semibold text-foreground">Hudud</p><p className="text-xs text-muted-foreground">Toshkent viloyati</p></div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center"><Bell className="w-4 h-4 text-amber-600" /></div>
        <div className="flex-1"><p className="text-sm font-semibold text-foreground">Bildirishnomalar</p><p className="text-xs text-muted-foreground">Kundalik tavsiyalar</p></div>
        <button onClick={() => setNotifications((n: boolean) => !n)} className={`relative w-12 h-6 rounded-full transition-colors ${notifications ? "bg-green-500" : "bg-gray-300"}`}>
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifications ? "translate-x-7" : "translate-x-1"}`} />
        </button>
      </div>
    </div>
  );

  const statsCard = (
    <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-5 text-white flex justify-around">
      <div className="text-center"><p className="text-2xl font-extrabold">{mockHistory.length}</p><p className="text-xs opacity-80">Tahlillar</p></div>
      <div className="w-px bg-white/20" />
      <div className="text-center"><p className="text-2xl font-extrabold">3</p><p className="text-xs opacity-80">Dalalar</p></div>
      <div className="w-px bg-white/20" />
      <div className="text-center"><p className="text-2xl font-extrabold">65</p><p className="text-xs opacity-80">Sotix</p></div>
    </div>
  );

  const helpBtn = (
    <button className="w-full bg-white border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:bg-gray-50 transition-colors">
      <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center"><HelpCircle className="w-4 h-4 text-purple-600" /></div>
      <div className="flex-1 text-left"><p className="text-sm font-semibold text-foreground">Yordam</p><p className="text-xs text-muted-foreground">Qo'llanma va FAQ</p></div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );

  if (isDesktop) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto w-full">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Profil</h2>
          <p className="text-sm text-muted-foreground mt-1">Shaxsiy ma'lumotlar va sozlamalar</p>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {/* Left: avatar + stats */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col items-center gap-3">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-700 rounded-3xl flex items-center justify-center shadow-xl">
                <User className="w-10 h-10 text-white" />
              </div>
              <p className="text-lg font-bold text-foreground">Abdullayev Jasur</p>
              <p className="text-sm text-muted-foreground">Toshkent viloyati</p>
            </div>
            {statsCard}
          </div>
          {/* Right: settings */}
          <div className="col-span-2 flex flex-col gap-4">
            <h3 className="font-bold text-foreground">Sozlamalar</h3>
            {settingsCard}
            {helpBtn}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-4 pt-5">
      <div className="flex flex-col items-center py-6">
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-700 rounded-3xl flex items-center justify-center shadow-xl mb-3">
          <User className="w-10 h-10 text-white" />
        </div>
        <p className="text-xl font-bold text-foreground">Abdullayev Jasur</p>
        <p className="text-sm text-muted-foreground">Toshkent viloyati</p>
      </div>
      <div className="flex flex-col gap-3">
        {settingsCard}
        {helpBtn}
        {statsCard}
      </div>
    </div>
  );
}

// ── Bottom Navigation (Mobile) ─────────────────────────────────────────────────

const NAV_ITEMS: { id: NavTab; icon: React.ElementType; label: string }[] = [
  { id: "home", icon: Home, label: "Bosh sahifa" },
  { id: "field", icon: Map, label: "Dala" },
  { id: "results", icon: BarChart3, label: "Natijalar" },
  { id: "profile", icon: User, label: "Profil" },
];

function BottomNav({ active, onChange }: { active: NavTab; onChange: (t: NavTab) => void }) {
  return (
    <nav className="flex-shrink-0 bg-white border-t border-border flex items-center shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex-1 flex flex-col items-center gap-1 py-3 px-1 transition-colors ${active === id ? "text-green-600" : "text-muted-foreground"}`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${active === id ? "bg-green-100" : ""}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-semibold leading-none">{label}</span>
        </button>
      ))}
    </nav>
  );
}

// ── Desktop Sidebar ────────────────────────────────────────────────────────────

const SIDEBAR_ITEMS: { id: NavTab; icon: React.ElementType; label: string }[] = [
  { id: "home", icon: LayoutDashboard, label: "Bosh sahifa" },
  { id: "field", icon: Map, label: "Dala xaritasi" },
  { id: "results", icon: BarChart3, label: "Tahlil tarixi" },
  { id: "profile", icon: User, label: "Profil" },
];

function DesktopSidebar({
  active,
  onChange,
  collapsed,
  onToggle,
}: {
  active: NavTab;
  onChange: (t: NavTab) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={`flex-shrink-0 bg-white border-r border-border flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}
      style={{ height: "100vh" }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-border ${collapsed ? "justify-center" : ""}`}>
        <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="font-extrabold text-green-700 text-base tracking-tight">AgroVision AI</span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 px-2 py-4">
        {SIDEBAR_ITEMS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            title={collapsed ? label : undefined}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl font-semibold text-sm transition-all w-full ${
              active === id
                ? "bg-green-100 text-green-700"
                : "text-muted-foreground hover:bg-gray-100 hover:text-foreground"
            } ${collapsed ? "justify-center" : ""}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom: collapse toggle + logout */}
      <div className="px-2 pb-4 flex flex-col gap-1 border-t border-border pt-3">
        <button
          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-muted-foreground hover:bg-gray-100 transition-all w-full ${collapsed ? "justify-center" : ""}`}
          title="Sozlamalar"
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sozlamalar</span>}
        </button>
        <button
          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all w-full ${collapsed ? "justify-center" : ""}`}
          title="Chiqish"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Chiqish</span>}
        </button>
        <button
          onClick={onToggle}
          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-muted-foreground hover:bg-gray-100 transition-all w-full ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Kengaytirish" : "Yig'ish"}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span>Yig'ish</span>}
        </button>
      </div>
    </aside>
  );
}

// ── Desktop Top Header ─────────────────────────────────────────────────────────

function DesktopHeader({
  screen,
  nav,
  onMenuToggle,
  onAnalyzeResult,
}: {
  screen: Screen;
  nav: NavTab;
  onMenuToggle: () => void;
  onAnalyzeResult?: () => void;
}) {
  const titles: Partial<Record<Screen, string>> = {
    landing: "Bosh sahifa",
    field: "Dala Xaritasi",
    upload: "Rasm Yuklash",
    loading: "Tahlil jarayoni",
    result: "Tahlil Natijalari",
    history: "Tahlil Tarixi",
    profile: "Profil",
  };

  return (
    <header className="flex-shrink-0 bg-white border-b border-border px-6 py-4 flex items-center gap-4 shadow-sm">
      <button onClick={onMenuToggle} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-muted-foreground">
        <Menu className="w-5 h-5" />
      </button>
      <h1 className="font-extrabold text-foreground text-lg flex-1">{titles[screen] ?? "AgroVision AI"}</h1>
      {screen === "result" && (
        <div className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full">O'rtacha xavf</div>
      )}
      {/* User avatar */}
      <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-green-700 rounded-xl flex items-center justify-center shadow">
        <User className="w-5 h-5 text-white" />
      </div>
    </header>
  );
}

// ── App Shell ──────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [nav, setNav] = useState<NavTab>("home");
  const [fieldData, setFieldData] = useState<{ points: LatLng[]; crop: string }>({ points: [], crop: "Pomidor" });
  const [resultArea, setResultArea] = useState("25 sotix");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();

  const handleNavChange = (tab: NavTab) => {
    setNav(tab);
    if (tab === "home") setScreen("landing");
    else if (tab === "field") setScreen("field");
    else if (tab === "results") setScreen("history");
    else if (tab === "profile") setScreen("profile");
  };

  const handleFieldNext = (data: { points: LatLng[]; crop: string }) => {
    setFieldData(data);
    const a = calcArea(data.points);
    if (a.sotix > 0) setResultArea(`${a.sotix} sotix`);
    setScreen("upload");
  };

  const handleLoadingDone = useCallback(() => {
    setScreen("result");
    setNav("results");
  }, []);

  const showNav = screen !== "landing" && screen !== "loading";

  const headerTitle: Partial<Record<Screen, string>> = {
    field: "AgroVision AI",
    upload: "AgroVision AI",
    result: "Tahlil Natijalari",
    history: "AgroVision AI",
    profile: "AgroVision AI",
  };

  const resultBadge = screen === "result" && (
    <div className="ml-auto bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">O'rtacha xavf</div>
  );

  // ── Desktop Layout ──────────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <div
        className="flex bg-background"
        style={{ height: "100dvh", fontFamily: "'Plus Jakarta Sans', 'Noto Sans', sans-serif" }}
      >
        <DesktopSidebar
          active={nav}
          onChange={handleNavChange}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <DesktopHeader
            screen={screen}
            nav={nav}
            onMenuToggle={() => setSidebarCollapsed(c => !c)}
          />
          <main className="flex-1 overflow-y-auto">
            {screen === "landing" && <LandingScreen onStart={() => { setScreen("field"); setNav("field"); }} isDesktop />}
            {screen === "field" && <FieldScreen onNext={handleFieldNext} isDesktop />}
            {screen === "upload" && <UploadScreen onAnalyze={() => setScreen("loading")} isDesktop />}
            {screen === "loading" && <LoadingScreen onDone={handleLoadingDone} />}
            {screen === "result" && <ResultScreen crop={fieldData.crop} area={resultArea} isDesktop />}
            {screen === "history" && <HistoryScreen isDesktop />}
            {screen === "profile" && <ProfileScreen isDesktop />}
          </main>
        </div>
      </div>
    );
  }

  // ── Mobile Layout ───────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col bg-background"
      style={{ height: "100dvh", maxWidth: 480, margin: "0 auto", fontFamily: "'Plus Jakarta Sans', 'Noto Sans', sans-serif" }}
    >
      {showNav && headerTitle[screen] && (
        <div className="flex-shrink-0 bg-white border-b border-border px-5 py-4 flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-green-700 text-base tracking-tight">{headerTitle[screen]}</span>
          {resultBadge}
        </div>
      )}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {screen === "landing" && <LandingScreen onStart={() => { setScreen("field"); setNav("field"); }} />}
        {screen === "field" && <FieldScreen onNext={handleFieldNext} />}
        {screen === "upload" && <UploadScreen onAnalyze={() => setScreen("loading")} />}
        {screen === "loading" && <LoadingScreen onDone={handleLoadingDone} />}
        {screen === "result" && <ResultScreen crop={fieldData.crop} area={resultArea} />}
        {screen === "history" && <HistoryScreen />}
        {screen === "profile" && <ProfileScreen />}
      </div>
      {showNav && <BottomNav active={nav} onChange={handleNavChange} />}
    </div>
  );
}
