import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Pencil,
  Map,
  CheckCircle2,
  Sprout,
  LayoutList,
  X,
  Calendar,
  Download,
  Save,
  FileJson,
} from "lucide-react";
import {
  MapboxFieldMap,
  type MapboxFieldMapHandle,
  type AreaResult,
} from "../components/MapboxFieldMap";
import { AreaDisplay } from "../components/AreaDisplay";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CROPS } from "@/constants";
import { ROUTES } from "@/router/routes";
import type { FieldData, SavedField } from "@/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Local storage helpers ──────────────────────────────────────────────────────
const STORAGE_KEY = "agrovision_saved_fields";

function loadFields(): SavedField[] {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]",
    ) as SavedField[];
  } catch {
    return [];
  }
}

function saveFields(fields: SavedField[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
}

// ── Name dialog ────────────────────────────────────────────────────────────────
interface NameDialogProps {
  defaultName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

function NameDialog({ defaultName, onConfirm, onCancel }: NameDialogProps) {
  const [name, setName] = useState(defaultName);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-lg text-foreground mb-1">
          Dala nomini kiriting
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Bu nom xaritada ko'rinadi
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && name.trim() && onConfirm(name.trim())
          }
          placeholder="Masalan: Shimoliy dala"
          className="w-full border border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
        />
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-border text-muted-foreground font-semibold hover:bg-gray-50 transition-colors"
          >
            Bekor qilish
          </button>
          <button
            onClick={() => name.trim() && onConfirm(name.trim())}
            disabled={!name.trim()}
            className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-40"
          >
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FieldPage ──────────────────────────────────────────────────────────────────
export function FieldPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const mapboxRef = useRef<MapboxFieldMapHandle>(null);

  const [savedFields, setSavedFields] = useState<SavedField[]>(loadFields);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(
    () => loadFields()[0]?.id ?? null,
  );
  // Currently drawn (unsaved) polygon
  const [draftPolygon, setDraftPolygon] =
    useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(null);
  const [draftArea, setDraftArea] = useState<AreaResult>({
    m2: 0,
    sotix: 0,
    hectare: 0,
  });

  // Name dialog state
  const [showNameDialog, setShowNameDialog] = useState(false);
  const pendingFieldRef = useRef<{
    polygon: GeoJSON.Feature<GeoJSON.Polygon>;
    area: AreaResult;
  } | null>(null);

  // History from backend
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch("http://localhost:8000/api/satellite/history/");
      const data = await res.json();
      setHistory(data.results || []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Analysis panel state
  const [analysisTab, setAnalysisTab] = useState("NDVI");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Form state (for selected field)
  const [crop, setCrop] = useState("Pomidor");
  const [lastIrrigation, setLastIrrigation] = useState("");
  const [waterCycle, setWaterCycle] = useState("7");

  // Panel view on mobile: 'map' | 'list'
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  const activeField = savedFields.find((f) => f.id === activeFieldId) ?? null;

  const handlePolygonChange = useCallback(
    (geojson: GeoJSON.Feature<GeoJSON.Polygon> | null) => {
      setDraftPolygon(geojson);
    },
    [],
  );

  const handleAreaChange = useCallback((a: AreaResult) => {
    setDraftArea(a);
  }, []);

  // Save drawn polygon → open name dialog
  const handleSaveDraft = () => {
    if (!draftPolygon || draftArea.m2 < 100) return;
    pendingFieldRef.current = { polygon: draftPolygon, area: draftArea };
    setShowNameDialog(true);
  };

  const handleConfirmName = (name: string) => {
    if (!pendingFieldRef.current) return;
    const { polygon, area } = pendingFieldRef.current;
    const newField: SavedField = {
      id: crypto.randomUUID(),
      name,
      crop,
      polygon,
      area,
      createdAt: new Date().toISOString(),
    };
    const updated = [...savedFields, newField];
    setSavedFields(updated);
    saveFields(updated);
    setActiveFieldId(newField.id);
    setShowNameDialog(false);
    pendingFieldRef.current = null;
    // Clear draw canvas
    mapboxRef.current?.clearActive();
    setDraftPolygon(null);
    setDraftArea({ m2: 0, sotix: 0, hectare: 0 });
  };

  const handleDeleteField = (id: string) => {
    const updated = savedFields.filter((f) => f.id !== id);
    setSavedFields(updated);
    saveFields(updated);
    if (activeFieldId === id) setActiveFieldId(updated[0]?.id ?? null);
  };

  const handleFieldClick = useCallback(
    (id: string) => {
      setActiveFieldId(id);
      if (isMobile) setMobileView("list");
    },
    [isMobile],
  );

  const handleNext = () => {
    if (!activeField) {
      alert("Avval dala tanlang yoki yangi dala chizing.");
      return;
    }
    const fieldData: FieldData = {
      points: activeField.polygon.geometry.coordinates[0].map(([lng, lat]) => ({
        lat,
        lng,
      })),
      crop: activeField.crop,
      name: activeField.name,
      area_ha: activeField.area.hectare,
      lastIrrigation,
      waterCycle,
    };
    sessionStorage.setItem("fieldData", JSON.stringify(fieldData));
    navigate(ROUTES.LOADING);
  };

  const handleFitFields = () => mapboxRef.current?.fitToFields();

  const handleStartAnalysis = async () => {
    if (!activeField) return;
    try {
      setIsAnalyzing(true);
      const payload = {
        coordinates: activeField.polygon.geometry.coordinates[0].map(
          ([lng, lat]) => ({ lat, lng }),
        ),
        area_ha: activeField.area.hectare,
        save: true,
        name: activeField.name,
      };
      const res = await fetch("http://localhost:8000/api/satellite/analyze/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setAnalysisResult(data);
      fetchHistory(); // Refresh history
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── History Sidebar ────────────────────────────────────────────────────────
  const historySidebar = (
    <div className="w-72 flex-shrink-0 bg-[#0f172a] text-white flex flex-col h-full border-r border-white/10">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
            <Calendar className="w-3 h-3" />
          </div>
          <span className="font-bold text-sm">Tarix</span>
          <span className="bg-blue-600 text-[10px] px-1.5 py-0.5 rounded-full">
            {history.length}
          </span>
        </div>
        <button className="text-white/50 hover:text-white transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {history.map((item) => (
          <div
            key={item.id}
            className="bg-[#1e293b] rounded-xl p-3 border border-white/5 hover:border-blue-500/50 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="bg-orange-500/20 text-orange-500 text-[10px] font-bold px-1.5 py-0.5 rounded border border-orange-500/30">
                  {item.ndvi_current?.toFixed(2) || "0.00"}
                </span>
                <span className="font-bold text-xs truncate max-w-[100px]">
                  {item.name}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-white/40 mb-3">
              {item.center_lat.toFixed(4)}, {item.center_lng.toFixed(4)} •{" "}
              {item.area_ha.toFixed(1)} ha
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/60 mb-3">
              <Calendar className="w-3 h-3" />
              {new Date(item.created_at).toLocaleDateString()} • DI{" "}
              {item.drought_index?.toFixed(2) || "0.00"}
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors">
                <Download className="w-3 h-3" /> Yuklash
              </button>
              <button className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors">
                <X className="w-3 h-3" /> O'chirish
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Analysis Panel ─────────────────────────────────────────────────────────
  const analysisPanel = (
    <div className="w-[450px] flex-shrink-0 bg-[#0f172a] text-white flex flex-col h-full border-l border-white/10">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="font-bold text-sm">Sun'iy yo'ldosh tahlili</span>
        </div>
        <div className="flex gap-2">
          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <Save className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <FileJson className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Coordinates Section */}
        <div className="p-4">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3">
            Belgilangan koordinatalar
          </p>
          <div className="flex flex-col gap-1 mb-3">
            {activeField?.polygon.geometry.coordinates[0]
              .slice(0, 4)
              .map((coord, idx) => (
                <div key={idx} className="flex gap-3 text-xs font-mono">
                  <span className="text-white/20">{idx + 1}</span>
                  <span className="text-green-500">{coord[1].toFixed(5)},</span>
                  <span className="text-green-500">{coord[0].toFixed(5)}</span>
                </div>
              ))}
          </div>
          <div className="text-xs">
            <span className="text-white/40 font-medium">Maydon: </span>
            <span className="text-green-500 font-bold">
              {activeField?.area?.hectare?.toFixed(2) || "0.00"} ha
            </span>
            <span className="text-white/40 font-medium mx-1">•</span>
            <span className="text-white/40 font-medium">
              {(activeField?.area?.m2 ? activeField.area.m2 / 1000000 : 0).toFixed(4)} km²
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="px-4 mb-6">
          <button
            onClick={handleStartAnalysis}
            disabled={isAnalyzing}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
          >
            {isAnalyzing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "🛰️ Haqiqiy ma'lumotlarni tahlil qilish"
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-4 mb-6">
          {["NDVI", "Tuproq", "Ob-havo", "AI Tahlil"].map((tab) => (
            <button
              key={tab}
              onClick={() => setAnalysisTab(tab)}
              className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${analysisTab === tab ? "text-green-500 border-green-500" : "text-white/40 border-transparent hover:text-white/60"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {analysisTab === "NDVI" && (
          <div className="px-6 pb-8">
            {analysisResult ? (
              <>
                <div className="text-center mb-8">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">
                    Joriy NDVI
                  </p>
                  <h2 className="text-7xl font-black text-green-500 mb-2">
                    {analysisResult.ndvi_current?.toFixed(3) || "0.000"}
                  </h2>
                  <p className="text-[10px] text-white/30 mb-4">
                    Normalized Difference Vegetation Index • ERA5
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="bg-green-500/20 text-green-500 text-[10px] font-bold px-3 py-1 rounded-full border border-green-500/30 flex items-center gap-1">
                      ↑ +0.058 (1 yil)
                    </div>
                    <div className="bg-white/5 text-white/60 text-[10px] font-bold px-3 py-1 rounded-full border border-white/10">
                      2026-05
                    </div>
                  </div>
                </div>

                {/* NDVI Scale */}
                <div className="mb-8">
                  <div className="h-2 w-full rounded-full bg-gradient-to-r from-red-500 via-orange-400 via-yellow-300 via-green-400 to-green-700 relative">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-4 border-blue-500 rounded-full shadow-lg"
                      style={{
                        left: `${((analysisResult.ndvi_current + 0.1) / 1.1) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] font-mono text-white/30">
                    <span>-0.1</span>
                    <span>0.0</span>
                    <span>0.2</span>
                    <span>0.4</span>
                    <span>0.6</span>
                    <span>0.8</span>
                    <span>1.0</span>
                  </div>
                </div>

                {/* Trend Chart */}
                <div className="mb-8">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-4">
                    12 oylik NDVI, EVI & NDWI trend
                  </p>
                  <div className="h-48 w-full bg-[#1e293b]/50 rounded-xl p-2 border border-white/5">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[
                          { name: "05", ndvi: 0.55 },
                          { name: "06", ndvi: 0.42 },
                          { name: "07", ndvi: 0.35 },
                          { name: "08", ndvi: 0.28 },
                          { name: "09", ndvi: 0.25 },
                          { name: "10", ndvi: 0.22 },
                          { name: "11", ndvi: 0.24 },
                          { name: "12", ndvi: 0.2 },
                          { name: "01", ndvi: 0.22 },
                          { name: "02", ndvi: 0.18 },
                          { name: "03", ndvi: 0.32 },
                          { name: "04", ndvi: 0.48 },
                          { name: "05", ndvi: 0.62 },
                        ]}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.05)"
                        />
                        <XAxis
                          dataKey="name"
                          fontSize={10}
                          stroke="rgba(255,255,255,0.3)"
                        />
                        <YAxis
                          fontSize={10}
                          stroke="rgba(255,255,255,0.3)"
                          domain={[-0.1, 1]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "10px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="ndvi"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "#22c55e" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Drought Index Slider */}
                <div className="mb-8">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-4">
                    Qurg'oqchilik indeksi (DI)
                  </p>
                  <div className="bg-[#1e293b] rounded-xl p-4 border border-white/5">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-bold text-white/60">
                        Juda quruq ⟷ Nam
                      </span>
                      <span className="text-xs font-bold text-orange-400">
                        {analysisResult.drought_index?.toFixed(2) || "0.00"}{" "}
                        Biroz nam
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full relative overflow-hidden">
                      <div
                        className="absolute h-full bg-orange-500 rounded-full"
                        style={{
                          width: `${(analysisResult.drought_index / 1) * 100}%`,
                          left: "40%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <Map className="w-8 h-8" />
                </div>
                <p className="text-xs font-medium max-w-[200px] leading-relaxed">
                  Xaritada hudud belgilang va haqiqiy sun'iy yo'ldosh
                  ma'lumotlarini oling
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  const fieldsList = (
    <div className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0">
      {savedFields.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
            <Map className="w-7 h-7 text-green-400" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">
            Hali dala belgilanmagan
          </p>
          <p className="text-xs text-muted-foreground">
            Xaritada maydon chizing va saqlang
          </p>
        </div>
      ) : (
        savedFields.map((f) => {
          const isActive = f.id === activeFieldId;
          return (
            <div
              key={f.id}
              onClick={() => setActiveFieldId(f.id)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isActive ? "bg-green-50 border-green-300" : "bg-white border-border hover:bg-gray-50"}`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? "bg-green-600" : "bg-green-100"}`}
              >
                <Sprout
                  className={`w-4 h-4 ${isActive ? "text-white" : "text-green-600"}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`font-bold text-sm truncate ${isActive ? "text-green-800" : "text-foreground"}`}
                >
                  {f.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {f.crop} • {f.area.sotix} sotix
                </p>
              </div>
              {isActive && (
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteField(f.id);
                }}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })
      )}
    </div>
  );

  // ── Form panel ─────────────────────────────────────────────────────────────
  const formPanel = (
    <div className="flex flex-col gap-3">
      {activeField ? (
        <>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-green-800 truncate">
                {activeField.name}
              </p>
              <p className="text-xs text-green-600">
                {activeField.area.sotix} sotix •{" "}
                {activeField.area.m2.toLocaleString()} m²
              </p>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">
              Ekin turi
            </label>
            <div className="relative">
              <select
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="w-full bg-input-background border border-border rounded-xl px-4 py-3 text-foreground appearance-none font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {CROPS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                So'nggi sug'orish
              </label>
              <input
                type="date"
                value={lastIrrigation}
                onChange={(e) => setLastIrrigation(e.target.value)}
                className="w-full bg-input-background border border-border rounded-xl px-3 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Davr (kun)
              </label>
              <input
                type="number"
                value={waterCycle}
                onChange={(e) => setWaterCycle(e.target.value)}
                min={1}
                max={30}
                className="w-full bg-input-background border border-border rounded-xl px-3 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
    <div className="flex flex-col gap-3">
      <button
        onClick={handleNext}
        className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-base mt-1"
      >
        Tahlilni boshlash <ChevronRight className="w-5 h-5" />
      </button>
      <p className="text-[10px] text-center text-muted-foreground px-4">
        Ma'lumotlar sun'iy yo'ldosh va AI orqali tahlil qilinadi
      </p>
    </div>
        </>
      ) : (
        <div className="text-center py-6 text-sm text-muted-foreground">
          Ro'yxatdan dala tanlang yoki yangi dala chizing
        </div>
      )}
    </div>
  );

  // ── Map action bar ─────────────────────────────────────────────────────────
  const mapActions = (
    <div className="flex gap-2">
      <button
        onClick={() => mapboxRef.current?.startDrawing()}
        className="flex-1 py-3 rounded-xl font-semibold text-sm bg-green-100 text-green-700 hover:bg-green-200 transition-all flex items-center justify-center gap-2 shadow-sm"
      >
        <Plus className="w-4 h-4" /> Yangi dala chizish
      </button>
      {draftPolygon && draftArea.m2 >= 100 && (
        <button
          onClick={handleSaveDraft}
          className="flex-1 py-3 rounded-xl font-semibold text-sm bg-green-600 text-white hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4" /> Saqlash
        </button>
      )}
      {draftPolygon && (
        <button
          onClick={() => mapboxRef.current?.clearActive()}
          className="p-3 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors shadow-sm"
          title="Bekor qilish"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      {savedFields.length > 0 && !draftPolygon && (
        <button
          onClick={handleFitFields}
          className="p-3 rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors shadow-sm"
          title="Barcha dalalarni ko'rsatish"
        >
          <Pencil className="w-5 h-5" />
        </button>
      )}
    </div>
  );

  // ── Desktop layout ─────────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <>
        {showNameDialog && (
          <NameDialog
            defaultName={`Dala ${savedFields.length + 1}`}
            onConfirm={handleConfirmName}
            onCancel={() => {
              setShowNameDialog(false);
              pendingFieldRef.current = null;
            }}
          />
        )}
        <div className="flex flex-col h-screen overflow-hidden">
          <div className="flex-shrink-0 px-8 pt-6 pb-4">
            <h2 className="text-2xl font-bold text-foreground">
              Dala Xaritasi
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Maydonlarni belgilang, nomlang va tahlilga yuboring
            </p>
          </div>
          <div className="flex-1 flex gap-5 px-8 pb-8 overflow-hidden">
            {/* Map */}
            <div className="flex-1 flex flex-col gap-3 min-w-0">
              <div className="relative flex-1 rounded-2xl overflow-hidden shadow-lg border border-border">
                <MapboxFieldMap
                  ref={mapboxRef}
                  savedFields={savedFields}
                  activeFieldId={activeFieldId}
                  onPolygonChange={handlePolygonChange}
                  onAreaChange={handleAreaChange}
                  onFieldClick={handleFieldClick}
                />
              </div>
              {mapActions}
              {draftPolygon && draftArea.m2 > 0 && (
                <AreaDisplay
                  m2={draftArea.m2}
                  sotix={draftArea.sotix}
                  hectare={draftArea.hectare}
                />
              )}
            </div>

            {/* Sidebar */}
            <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-hidden">
              {/* Fields list */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
                <div className="flex items-center justify-between flex-shrink-0">
                  <h3 className="font-bold text-foreground">
                    Mening dalalarim
                  </h3>
                  <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    {savedFields.length} ta
                  </span>
                </div>
                {fieldsList}
              </div>
              {/* Form */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-4 flex-shrink-0">
                <h3 className="font-bold text-foreground mb-3">
                  Tahlil ma'lumotlari
                </h3>
                {formPanel}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Mobile layout ──────────────────────────────────────────────────────────
  return (
    <>
      {showNameDialog && (
        <NameDialog
          defaultName={`Dala ${savedFields.length + 1}`}
          onConfirm={handleConfirmName}
          onCancel={() => {
            setShowNameDialog(false);
            pendingFieldRef.current = null;
          }}
        />
      )}
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header with tab toggle */}
        <div className="flex-shrink-0 px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Dala Xaritasi</h2>
            <p className="text-xs text-muted-foreground">
              {savedFields.length} ta dala saqlangan
            </p>
          </div>
          <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
            <button
              onClick={() => setMobileView("map")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${mobileView === "map" ? "bg-white text-green-700 shadow" : "text-gray-500"}`}
            >
              <Map className="w-3.5 h-3.5" /> Xarita
            </button>
            <button
              onClick={() => setMobileView("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${mobileView === "list" ? "bg-white text-green-700 shadow" : "text-gray-500"}`}
            >
              <LayoutList className="w-3.5 h-3.5" /> Dalalar
            </button>
          </div>
        </div>

        {mobileView === "map" ? (
          <>
            <div
              className="relative mx-4 rounded-2xl overflow-hidden shadow-lg border border-border flex-1 min-h-0"
              style={{ minHeight: 240 }}
            >
              <MapboxFieldMap
                ref={mapboxRef}
                savedFields={savedFields}
                activeFieldId={activeFieldId}
                onPolygonChange={handlePolygonChange}
                onAreaChange={handleAreaChange}
                onFieldClick={handleFieldClick}
              />
            </div>
            <div className="flex-shrink-0 px-4 mt-3">{mapActions}</div>
            {draftPolygon && draftArea.m2 > 0 && (
              <div className="flex-shrink-0 mx-4 mt-2">
                <AreaDisplay
                  m2={draftArea.m2}
                  sotix={draftArea.sotix}
                  hectare={draftArea.hectare}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col gap-3 px-4 overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto min-h-0">{fieldsList}</div>
            <div className="flex-shrink-0 pb-4">{formPanel}</div>
          </div>
        )}
      </div>
    </>
  );
}
