import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Map,
  CheckCircle2,
  Sprout,
  X,
  Calendar,
  Download,
  Save,
  FileJson,
  Loader2,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  AlertTriangle,
  Lightbulb,
  Zap,
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
  crop: string;
  onCropChange: (crop: string) => void;
}

function NameDialog({
  defaultName,
  onConfirm,
  onCancel,
  crop,
  onCropChange,
}: NameDialogProps) {
  const [name, setName] = useState(defaultName);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-sm:max-w-xs">
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
        <div className="mb-4">
          <label className="text-sm font-semibold text-foreground mb-2 block">
            Ekin turi
          </label>
          <select
            value={crop}
            onChange={(e) => onCropChange(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Ekin turini tanlang</option>
            {CROPS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-border text-muted-foreground font-semibold hover:bg-gray-50 transition-colors"
          >
            Bekor qilish
          </button>
          <button
            onClick={() => name.trim() && crop && onConfirm(name.trim())}
            disabled={!name.trim() || !crop}
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
  const [crop, setCrop] = useState<string>("");
  const pendingFieldRef = useRef<{
    polygon: GeoJSON.Feature<GeoJSON.Polygon>;
    area: AreaResult;
  } | null>(null);

  // History from backend
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Analysis panel state
  const [analysisTab, setAnalysisTab] = useState("NDVI");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Panel view on mobile: 'map' | 'analysis' | 'history'
  const [mobileView, setMobileView] = useState<"map" | "analysis" | "history">(
    "map",
  );

  const activeField = savedFields.find((f) => f.id === activeFieldId) ?? null;

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
    setCrop("");
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

  const handleDeleteHistory = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Haqiqatan ham ushbu tahlilni o'chirmoqchimisiz?")) return;
    try {
      await fetch(`http://localhost:8000/api/satellite/history/${id}/`, {
        method: "DELETE",
      });
      fetchHistory();
      if (analysisResult?.id === id) setAnalysisResult(null);
    } catch (err) {
      console.error("Failed to delete history:", err);
    }
  };

  const handleFieldClick = useCallback(
    (id: string) => {
      setActiveFieldId(id);
      if (isMobile) setMobileView("list");
    },
    [isMobile],
  );

  const handleStartAnalysis = async () => {
    if (!activeField) return;
    try {
      setIsAnalyzing(true);
      const payload = {
        coordinates: activeField.polygon.geometry.coordinates[0].map(
          ([lng, lat]) => ({ lat, lng }),
        ),
        area_ha: activeField.area.hectare,
        save: false,
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
    };
    sessionStorage.setItem("fieldData", JSON.stringify(fieldData));
    navigate(ROUTES.LOADING);
  };

  // ── Fields Sidebar ────────────────────────────────────────────────────────
  const fieldsSidebar = (
    <div className="w-72 flex-shrink-0 bg-white flex flex-col h-full border-r border-border">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center">
            <Map className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-sm text-foreground">
            Saqlangan maydonlar
          </span>
          <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
            {savedFields.length}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {savedFields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center opacity-60">
            <Map className="w-8 h-8 mb-2 text-muted-foreground" />
            <p className="text-xs font-medium">Hali maydon belgilanmagan</p>
          </div>
        ) : (
          savedFields.map((field) => (
            <div
              key={field.id}
              onClick={() => handleFieldClick(field.id)}
              className={`bg-gray-50 rounded-xl p-3 border-2 transition-all cursor-pointer group ${
                activeFieldId === field.id
                  ? "border-green-500 shadow-md bg-green-50"
                  : "border-border hover:border-green-300"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  <Sprout
                    className={`w-4 h-4 flex-shrink-0 ${activeFieldId === field.id ? "text-green-600" : "text-muted-foreground"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">
                      {field.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {field.crop}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteField(field.id);
                  }}
                  className="p-1 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="text-[10px] text-muted-foreground mb-2 font-mono">
                {field.area.hectare.toFixed(2)} ha •{" "}
                {(field.area.m2 / 1000000).toFixed(4)} km²
              </div>
              <div className="text-[10px] text-muted-foreground">
                {new Date(field.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // ── Analysis Panel ─────────────────────────────────────────────────────────
  const analysisPanel = (
    <div className="w-[450px] flex-shrink-0 bg-white flex flex-col h-full border-l border-border">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="font-bold text-sm text-foreground">
            Sun'iy yo'ldosh tahlili
          </span>
        </div>
        <div className="flex gap-2">
          <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors">
            <Save className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors">
            <FileJson className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAnalysisResult(null)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Coordinates Section */}
        <div className="p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Belgilangan koordinatalar
          </p>
          <div className="flex flex-col gap-1 mb-3">
            {activeField?.polygon.geometry.coordinates[0]
              .slice(0, 4)
              .map((coord, idx) => (
                <div key={idx} className="flex gap-3 text-xs font-mono">
                  <span className="text-gray-400">{idx + 1}</span>
                  <span className="text-green-600 font-semibold">
                    {coord[1].toFixed(5)},
                  </span>
                  <span className="text-green-600 font-semibold">
                    {coord[0].toFixed(5)}
                  </span>
                </div>
              ))}
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground font-medium">Maydon: </span>
            <span className="text-green-600 font-bold">
              {activeField?.area?.hectare?.toFixed(2) || "0.00"} ha
            </span>
            <span className="text-muted-foreground font-medium mx-1">•</span>
            <span className="text-muted-foreground font-medium">
              {(activeField?.area?.m2
                ? activeField.area.m2 / 1000000
                : 0
              ).toFixed(4)}{" "}
              km²
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="px-4 mb-6">
          <button
            onClick={handleStartAnalysis}
            disabled={isAnalyzing || !activeField}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
          >
            {isAnalyzing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : analysisResult ? (
              "🔄 Qayta tahlil qilish"
            ) : (
              "🛰️ Haqiqiy ma'lumotlarni tahlil qilish"
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-4 mb-6">
          {["NDVI", "Tuproq", "Ob-havo", "AI Tahlil"].map((tab) => (
            <button
              key={tab}
              onClick={() => setAnalysisTab(tab)}
              className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${analysisTab === tab ? "text-green-600 border-green-600" : "text-muted-foreground border-transparent hover:text-foreground"}`}
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
                    {analysisResult.ndvi?.current?.toFixed(3) || "0.000"}
                  </h2>
                  <p className="text-[10px] text-white/30 mb-4">
                    {analysisResult.analysis?.ndvi_baho ||
                      "Normalized Difference Vegetation Index"}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    {analysisResult.ndvi?.change !== undefined && (
                      <div className="bg-green-500/20 text-green-500 text-[10px] font-bold px-3 py-1 rounded-full border border-green-500/30 flex items-center gap-1">
                        {analysisResult.ndvi.change >= 0 ? "↑" : "↓"}{" "}
                        {analysisResult.ndvi.change >= 0 ? "+" : ""}
                        {analysisResult.ndvi.change?.toFixed(3)}
                      </div>
                    )}
                    <div className="bg-white/5 text-white/60 text-[10px] font-bold px-3 py-1 rounded-full border border-white/10">
                      {new Date().toISOString().slice(0, 7)}
                    </div>
                  </div>
                </div>

                {/* NDVI Scale */}
                <div className="mb-8">
                  <div className="h-2 w-full rounded-full bg-gradient-to-r from-red-500 via-orange-400 via-yellow-300 via-green-400 to-green-700 relative">
                    {analysisResult.ndvi?.current !== undefined && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-4 border-blue-500 rounded-full shadow-lg transition-all"
                        style={{
                          left: `${Math.max(0, Math.min(100, ((analysisResult.ndvi.current + 0.1) / 1.1) * 100))}%`,
                        }}
                      />
                    )}
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
                    NDVI Trend (Oylik)
                  </p>
                  <div className="h-48 w-full bg-[#1e293b]/50 rounded-xl p-2 border border-white/5 flex items-center justify-center">
                    {analysisResult.ndvi?.monthly &&
                    analysisResult.ndvi.monthly.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analysisResult.ndvi.monthly}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.05)"
                          />
                          <XAxis
                            dataKey="month"
                            fontSize={10}
                            stroke="rgba(255,255,255,0.3)"
                            tickFormatter={(v) => v.split("-")[1]}
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
                          <Line
                            type="monotone"
                            dataKey="ndwi"
                            stroke="#3b82f6"
                            strokeWidth={1}
                            strokeDasharray="3 3"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-[10px] text-white/20 italic">
                        Trend ma'lumotlari mavjud emas
                      </p>
                    )}
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
                      <span
                        className={`text-xs font-bold ${analysisResult.ndvi?.drought_index < 0 ? "text-orange-400" : "text-blue-400"}`}
                      >
                        {analysisResult.ndvi?.drought_index?.toFixed(2) ||
                          "0.00"}{" "}
                        {analysisResult.analysis?.qurgochlik}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full relative overflow-hidden">
                      <div
                        className="absolute h-full bg-orange-500 rounded-full transition-all"
                        style={{
                          width: "30%",
                          left: `${Math.max(0, Math.min(100, (analysisResult.ndvi?.drought_index + 1) * 50))}%`,
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

        {analysisTab === "Tuproq" && (
          <div className="px-6 pb-8">
            {analysisResult?.soil ? (
              <div className="flex flex-col gap-6">
                <div className="bg-[#1e293b] rounded-2xl p-5 border border-white/5">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-4">
                    Tuproq xususiyatlari
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-white/40">
                        pH darajasi
                      </span>
                      <span className="text-lg font-bold text-blue-400">
                        {analysisResult.soil.properties?.ph_h2o?.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-white/40">
                        Organik uglerod
                      </span>
                      <span className="text-lg font-bold text-green-400">
                        {analysisResult.soil.properties?.soc?.toFixed(1)} g/kg
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-white/40">
                        Azot miqdori
                      </span>
                      <span className="text-lg font-bold text-purple-400">
                        {analysisResult.soil.properties?.nitrogen} mg/kg
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-white/40">
                        Zichlik (BDOD)
                      </span>
                      <span className="text-lg font-bold text-orange-400">
                        {analysisResult.soil.properties?.bdod} kg/m³
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1e293b] rounded-2xl p-5 border border-white/5">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-4">
                    Tarkibi (%)
                  </p>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/60">Qum (Sand)</span>
                      <span className="font-bold">
                        {analysisResult.soil.properties?.sand}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500"
                        style={{
                          width: `${analysisResult.soil.properties?.sand}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-2">
                      <span className="text-white/60">Loy (Clay)</span>
                      <span className="font-bold">
                        {analysisResult.soil.properties?.clay}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{
                          width: `${analysisResult.soil.properties?.clay}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-2">
                      <span className="text-white/60">Silt</span>
                      <span className="font-bold">
                        {analysisResult.soil.properties?.silt}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${analysisResult.soil.properties?.silt}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#1e293b] rounded-xl p-4 border border-white/5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Thermometer className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40">Yuza temp.</p>
                      <p className="text-sm font-bold">
                        {analysisResult.soil.surface_temp}°C
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#1e293b] rounded-xl p-4 border border-white/5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Droplets className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40">
                        Namlik (0-1cm)
                      </p>
                      <p className="text-sm font-bold">
                        {analysisResult.soil.moisture_0_1cm}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Map className="w-8 h-8 mb-4" />
                <p className="text-xs font-medium">
                  Ma'lumotlar yuklanmoqda...
                </p>
              </div>
            )}
          </div>
        )}

        {analysisTab === "Ob-havo" && (
          <div className="px-6 pb-8">
            {analysisResult?.weather ? (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#1e293b] rounded-2xl p-5 border border-white/5 text-center">
                    <Thermometer className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                    <p className="text-[10px] text-white/40 uppercase">
                      O'rtacha harorat
                    </p>
                    <p className="text-2xl font-black">
                      {analysisResult.weather.avg_temp}°C
                    </p>
                  </div>
                  <div className="bg-[#1e293b] rounded-2xl p-5 border border-white/5 text-center">
                    <CloudRain className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-[10px] text-white/40 uppercase">
                      Yillik yog'in
                    </p>
                    <p className="text-2xl font-black">
                      {analysisResult.weather.annual_precip} mm
                    </p>
                  </div>
                  <div className="bg-[#1e293b] rounded-2xl p-5 border border-white/5 text-center">
                    <Wind className="w-6 h-6 text-teal-400 mx-auto mb-2" />
                    <p className="text-[10px] text-white/40 uppercase">
                      Shamol tezligi
                    </p>
                    <p className="text-2xl font-black">
                      {analysisResult.weather.avg_wind} m/s
                    </p>
                  </div>
                  <div className="bg-[#1e293b] rounded-2xl p-5 border border-white/5 text-center">
                    <Droplets className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <p className="text-[10px] text-white/40 uppercase">
                      Namlik
                    </p>
                    <p className="text-2xl font-black">
                      {analysisResult.weather.avg_humidity}%
                    </p>
                  </div>
                </div>

                <div className="bg-[#1e293b] rounded-2xl p-5 border border-white/5">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-4">
                    Yog'ingarchilik trendi (Monthly)
                  </p>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analysisResult.weather.monthly}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.05)"
                        />
                        <XAxis
                          dataKey="month"
                          fontSize={10}
                          stroke="rgba(255,255,255,0.3)"
                          tickFormatter={(v) => v.split("-")[1]}
                        />
                        <YAxis fontSize={10} stroke="rgba(255,255,255,0.3)" />
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
                          dataKey="precip"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "#3b82f6" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="temp"
                          stroke="#f97316"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "#f97316" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Map className="w-8 h-8 mb-4" />
                <p className="text-xs font-medium">
                  Ma'lumotlar yuklanmoqda...
                </p>
              </div>
            )}
          </div>
        )}

        {analysisTab === "AI Tahlil" && (
          <div className="px-6 pb-8">
            {analysisResult?.analysis ? (
              <div className="flex flex-col gap-6">
                {/* Summary Banner */}
                <div className="bg-gradient-to-br from-green-600/20 to-blue-600/20 rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">AI Xulosa</h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">
                        {analysisResult.source}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-white/80 italic">
                    "{analysisResult.analysis.xulosa}"
                  </p>
                </div>

                {/* Status Sections */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-[#1e293b] rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Sprout className="w-4 h-4 text-green-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        O'simlik holati
                      </span>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">
                      {analysisResult.analysis.osimlik_holati}
                    </p>
                  </div>
                  <div className="bg-[#1e293b] rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Map className="w-4 h-4 text-orange-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Tuproq tahlili
                      </span>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">
                      {analysisResult.analysis.tuproq_tahlili}
                    </p>
                  </div>
                </div>

                {/* Priority Actions */}
                <div>
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3 px-1">
                    Ustuvor harakatlar
                  </h4>
                  <div className="flex flex-col gap-2">
                    {analysisResult.analysis.ustuvor_harakatlar?.map(
                      (item: string, i: number) => (
                        <div
                          key={i}
                          className="bg-white/5 rounded-xl p-3 flex items-start gap-3 border border-white/5"
                        >
                          <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-500 flex-shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-xs text-white/80">{item}</p>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* Risks */}
                <div>
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-3 px-1">
                    Mumkin bo'lgan xavflar
                  </h4>
                  <div className="flex flex-col gap-2">
                    {analysisResult.analysis.xavflar?.map(
                      (item: string, i: number) => (
                        <div
                          key={i}
                          className="bg-red-500/5 rounded-xl p-3 flex items-start gap-3 border border-red-500/10"
                        >
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-white/80">{item}</p>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-[#1e293b] rounded-2xl p-5 border border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Dehqonchilik maslahatlari
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {analysisResult.analysis.dehqonchilik_maslahati?.map(
                      (item: string, i: number) => (
                        <li
                          key={i}
                          className="text-xs text-white/60 flex gap-2"
                        >
                          <span className="text-yellow-500 mt-1">•</span>
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Map className="w-8 h-8 mb-4" />
                <p className="text-xs font-medium">Tahlil o'tkazilmagan</p>
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
        </div>
      ) : (
        savedFields.map((f) => {
          const isActive = f.id === activeFieldId;
          return (
            <div
              key={f.id}
              onClick={() => handleFieldClick(f.id)}
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
          <button
            onClick={handleNext}
            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-base mt-1"
          >
            Tahlilni boshlash <ChevronRight className="w-5 h-5" />
          </button>
        </>
      ) : (
        <div className="text-center py-6 text-sm text-muted-foreground">
          Ro'yxatdan dala tanlang yoki yangi dala chizing
        </div>
      )}
    </div>
  );

  const mapActions = (
    <div className="flex gap-2">
      <button
        onClick={() => mapboxRef.current?.startDrawing()}
        className="flex-1 py-3 rounded-xl font-semibold text-sm bg-green-100 text-green-700 hover:bg-green-200 transition-all flex items-center justify-center gap-2 shadow-sm"
      >
        <Plus className="w-4 h-4" /> Yangi dala chizish
      </button>
      {draftPolygon && (
        <button
          onClick={handleSaveDraft}
          className="flex-1 py-3 rounded-xl font-semibold text-sm bg-green-600 text-white hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4" /> Saqlash
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
            crop={crop}
            onCropChange={setCrop}
          />
        )}
        <div className="flex h-screen overflow-hidden bg-white">
          {fieldsSidebar}
          <div className="flex-1 flex flex-col min-w-0 relative">
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              <button
                onClick={() => mapboxRef.current?.startDrawing()}
                className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-xl text-white hover:bg-white/20 transition-all shadow-xl"
                title="Yangi dala chizish"
              >
                <Plus className="w-5 h-5" />
              </button>
              {draftPolygon && (
                <button
                  onClick={handleSaveDraft}
                  className="bg-green-600 border border-green-500 p-3 rounded-xl text-white hover:bg-green-500 transition-all shadow-xl"
                  title="Saqlash"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              )}
            </div>
            <MapboxFieldMap
              ref={mapboxRef}
              savedFields={savedFields}
              activeFieldId={activeFieldId}
              onPolygonChange={handlePolygonChange}
              onAreaChange={handleAreaChange}
              onFieldClick={handleFieldClick}
            />
            {draftPolygon && draftArea.m2 > 0 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
                <AreaDisplay
                  m2={draftArea.m2}
                  sotix={draftArea.sotix}
                  hectare={draftArea.hectare}
                />
              </div>
            )}
          </div>
          {analysisPanel}
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
          crop={crop}
          onCropChange={setCrop}
        />
      )}
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-shrink-0 px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Dala Xaritasi</h2>
          </div>
          <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
            <button
              onClick={() => setMobileView("map")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${mobileView === "map" ? "bg-white text-green-700 shadow" : "text-gray-500"}`}
            >
              Xarita
            </button>
            <button
              onClick={() => setMobileView("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${mobileView === "list" ? "bg-white text-green-700 shadow" : "text-gray-500"}`}
            >
              Dalalar
            </button>
          </div>
        </div>
        {mobileView === "map" ? (
          <>
            <div className="relative mx-4 rounded-2xl overflow-hidden shadow-lg border border-border flex-1 min-h-0">
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
          </>
        ) : (
          <div className="flex-1 flex flex-col gap-3 px-4 overflow-hidden min-h-0 pb-4">
            <div className="flex-1 overflow-y-auto">{fieldsList}</div>
            {formPanel}
          </div>
        )}
      </div>
    </>
  );
}
