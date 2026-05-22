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
  Save,
  Edit,
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

// ── Helpers ──────────────────────────────────────────────────────────────────
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

// ── API helpers ──────────────────────────────────────────────────────────────
const API_BASE = "/api/satellite/fields/";

// ── FieldPage ──────────────────────────────────────────────────────────────────
export function FieldPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const mapboxRef = useRef<MapboxFieldMapHandle>(null);

  const [savedFields, setSavedFields] = useState<SavedField[]>([]);
  const [activeFieldId, setActiveFieldId] = useState<number | null>(null);
  const [isLoadingFields, setIsLoadingFields] = useState(true);

  // Fetch fields from API
  useEffect(() => {
    const fetchFields = async () => {
      try {
        setIsLoadingFields(true);
        const res = await fetch(API_BASE, { credentials: 'include' });
        const data = await res.json();
        const fields = data.results || [];
        setSavedFields(fields);
        if (fields.length > 0 && !activeFieldId) {
          setActiveFieldId(fields[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch fields:", err);
      } finally {
        setIsLoadingFields(false);
      }
    };
    fetchFields();
  }, []);
  // Currently drawn (unsaved) polygon
  const [draftPolygon, setDraftPolygon] =
    useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(null);
  const [draftArea, setDraftArea] = useState<AreaResult>({
    m2: 0,
    sotix: 0,
    hectare: 0,
  });

  // Field form state (o'ng panelda)
  const [fieldName, setFieldName] = useState<string>("");
  const [crop, setCrop] = useState<string>("");
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);

  // Analysis panel state
  const [analysisTab, setAnalysisTab] = useState("NDVI");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [mobileView, setMobileView] = useState<"map" | "analysis">(
    "map",
  );

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

  // Start drawing mode
  const handleStartDrawing = () => {
    setIsDrawingMode(true);
    setFieldName("");
    setCrop("");
    mapboxRef.current?.startDrawing();
  };

  // Save field with name and crop
  const handleSaveField = async () => {
    if (!draftPolygon || draftArea.m2 < 100 || !fieldName.trim() || !crop)
      return;

    const coordinates = draftPolygon.geometry.coordinates[0].map(([lng, lat]) => ({ lat, lng }));
    const center_lng = coordinates.reduce((s, c) => s + c.lng, 0) / coordinates.length;
    const center_lat = coordinates.reduce((s, c) => s + c.lat, 0) / coordinates.length;

    const payload = {
      name: fieldName.trim(),
      crop,
      coordinates,
      center_lat,
      center_lng,
      area_ha: draftArea.hectare,
      notes: "",
    };

    try {
      const url = editingFieldId ? `${API_BASE}${editingFieldId}/` : API_BASE;
      const method = editingFieldId ? "PATCH" : "POST";
      const csrftoken = getCookie("csrftoken");

      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          ...(csrftoken ? { "X-CSRFToken": csrftoken } : {}),
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      
      if (!res.ok) {
        const err = await res.json();
        console.error("Field save error details:", err);
        throw new Error(err.detail || err.message || "Field saqlashda xatolik");
      }
      
      const savedField: SavedField = await res.json();
      
      if (editingFieldId) {
        setSavedFields((prev) => prev.map(f => f.id === editingFieldId ? savedField : f));
      } else {
        setSavedFields((prev) => [...prev, savedField]);
      }
      
      setActiveFieldId(savedField.id);

      // Reset form
      setFieldName("");
      setCrop("");
      setIsDrawingMode(false);
      setEditingFieldId(null);

      // Clear draw canvas
      mapboxRef.current?.clearActive();
      setDraftPolygon(null);
      setDraftArea({ m2: 0, sotix: 0, hectare: 0 });
    } catch (err) {
      console.error("Save field failed:", err);
      alert("Dalani saqlashda xatolik yuz berdi.");
    }
  };

  const handleEditField = (field: SavedField) => {
    setEditingFieldId(field.id);
    setFieldName(field.name);
    setCrop(field.crop);
    setIsDrawingMode(true);
    if (isMobile) setMobileView("map");
    
    const geojson: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [field.coordinates.map(c => [c.lng, c.lat])]
      },
      properties: {}
    };
    
    setTimeout(() => {
      mapboxRef.current?.setPolygonForEditing(geojson);
    }, 100);
  };

  // Cancel drawing
  const handleCancelDrawing = () => {
    setIsDrawingMode(false);
    setEditingFieldId(null);
    setFieldName("");
    setCrop("");
    mapboxRef.current?.clearActive();
    setDraftPolygon(null);
    setDraftArea({ m2: 0, sotix: 0, hectare: 0 });
  };

  const handleDeleteField = async (id: number) => {
    if (!confirm("Haqiqatan ham ushbu dalani o'chirmoqchimisiz?")) return;
    try {
      const csrftoken = getCookie("csrftoken");
      const res = await fetch(`${API_BASE}${id}/`, { 
        method: "DELETE",
        headers: {
          ...(csrftoken ? { "X-CSRFToken": csrftoken } : {}),
        },
        credentials: "include" 
      });
      if (!res.ok) throw new Error("O'chirishda xatolik");
      
      const updated = savedFields.filter((f) => f.id !== id);
      setSavedFields(updated);
      if (activeFieldId === id) setActiveFieldId(updated[0]?.id ?? null);
    } catch (err) {
      console.error("Delete field failed:", err);
    }
  };

  const handleFieldClick = useCallback(
    (id: number) => {
      setActiveFieldId(id);
      if (isMobile) setMobileView("analysis");
    },
    [isMobile],
  );

  const handleStartAnalysis = async () => {
    if (!activeField) return;
    try {
      setIsAnalyzing(true);
      const csrftoken = getCookie("csrftoken");
      const payload = {
        coordinates: activeField.coordinates,
        area_ha: activeField.area_ha,
        save: false,
        name: activeField.name,
      };
      const res = await fetch("/api/satellite/analyze/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(csrftoken ? { "X-CSRFToken": csrftoken } : {}),
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await res.json();
      setAnalysisResult(data);
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
      points: activeField.coordinates,
      crop: activeField.crop,
      name: activeField.name,
      area_ha: activeField.area_ha,
    };
    sessionStorage.setItem("fieldData", JSON.stringify(fieldData));
    navigate(ROUTES.LOADING);
  };

  // Chap panel olib tashlandi - faqat saqlangan maydonlar ro'yxati

  // Saqlangan maydonlar sidebar olib tashlandi

  // ── Analysis Panel ─────────────────────────────────────────────────────────
  const analysisPanel = (
    <div className="w-[450px] flex-shrink-0 bg-white flex flex-col h-full border-l border-border">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="font-bold text-sm text-foreground">
            {isDrawingMode ? "Maydon belgilash" : "Sun'iy yo'ldosh tahlili"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Drawing Mode Form */}
        {isDrawingMode ? (
          <div className="p-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-900 mb-2">
                📍 Qanday qilib:
              </p>
              <ol className="text-xs text-blue-700 space-y-1.5">
                <li className="flex gap-2">
                  <span className="font-bold">1.</span>
                  <span>Xaritada nuqtalarni belgilang</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">2.</span>
                  <span>Kamida 3 ta nuqta bo'lgach, "Tugatish" tugmasini bosing yoki birinchi nuqtaga bosing. (Xatoni o'chirish uchun Backspace tugmasidan foydalaning)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">3.</span>
                  <span>Maydon nomi va ekin turini kiriting</span>
                </li>
                <li className="flex gap-2 text-primary font-bold">
                  <span>4.</span>
                  <span>"Saqlash" tugmasini bosing</span>
                </li>
              </ol>
            </div>

            {/* Current Draft Info */}
            {draftPolygon && draftArea.m2 > 0 ? (
              <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-primary mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Belgilangan hudud
                </p>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Maydon:</span>
                    <span className="font-bold text-lg text-primary">
                      {draftArea.hectare.toFixed(2)} ha
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Sotix:</span>
                    <span className="font-bold text-sm text-primary">
                      {draftArea.sotix.toFixed(1)} sotix
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      Kvadrat metr:
                    </span>
                    <span className="font-bold text-sm text-primary">
                      {draftArea.m2.toLocaleString()} m²
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Nuqtalar:</span>
                    <span className="font-bold text-sm text-primary">
                      {draftPolygon.geometry.coordinates[0].length - 1}
                    </span>
                  </div>
                </div>

                {/* Coordinates */}
                <div className="border-t border-primary/10 pt-3">
                  <p className="text-[10px] font-bold text-primary/60 uppercase tracking-wider mb-2">
                    Koordinatalar
                  </p>
                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                    {draftPolygon.geometry.coordinates[0]
                      .slice(0, -1)
                      .map((coord, idx) => (
                        <div key={idx} className="flex gap-3 text-xs font-mono">
                          <span className="text-primary/40 font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-primary/80">
                            {coord[1].toFixed(6)}, {coord[0].toFixed(6)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-border rounded-xl p-6 text-center">
                <Map className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-medium">
                  Xaritada hudud belgilang
                </p>
              </div>
            )}

            {/* Form Fields */}
            {draftPolygon && draftArea.m2 > 0 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Maydon nomi *
                  </label>
                  <input
                    type="text"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    placeholder="Masalan: Shimoliy dala"
                    className="w-full border border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Ekin turi *
                  </label>
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="w-full border border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                  >
                    <option value="">Ekin turini tanlang</option>
                    {CROPS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleCancelDrawing}
                    className="flex-1 py-3 rounded-xl border-2 border-border text-muted-foreground font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={handleSaveField}
                    disabled={!fieldName.trim() || !crop}
                    className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {editingFieldId ? "Yangilash" : "Saqlash"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Maydon belgilash button va koordinatalar */}
            <div className="p-4">
              <button
                onClick={handleStartDrawing}
                className="w-full py-4 rounded-xl bg-primary hover:opacity-90 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all mb-6"
              >
                <Plus className="w-5 h-5" />
                Maydon belgilash
              </button>

              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Belgilangan koordinatalar
                </p>
              </div>
              
              {activeField ? (
                <>
                  <div className="flex flex-col gap-1 mb-3">
                    {activeField.coordinates
                      .slice(0, 4)
                      .map((coord, idx) => (
                        <div key={idx} className="flex gap-3 text-xs font-mono">
                          <span className="text-muted-foreground/60">{idx + 1}</span>
                          <span className="text-primary font-semibold">
                            {coord.lat.toFixed(5)},
                          </span>
                          <span className="text-primary font-semibold">
                            {coord.lng.toFixed(5)}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground font-medium">Maydon: </span>
                    <span className="text-primary font-bold">
                      {activeField.area_ha.toFixed(2)} ha
                    </span>
                    <span className="text-muted-foreground/40 font-medium mx-1">•</span>
                    <span className="text-muted-foreground font-medium">
                      {activeField.area_sotix.toFixed(1)} sotix
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Map className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground">
                    Xaritada hudud belgilang va haqiqiy sun'iy yo'ldosh ma'lumotlarini oling
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {!isDrawingMode && (
          <>
            {/* Action Button */}
            <div className="px-4 mb-6">
              <button
                onClick={handleStartAnalysis}
                disabled={isAnalyzing || !activeField}
                className="w-full py-4 rounded-xl bg-primary hover:opacity-90 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
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
          </>
        )}

        {!isDrawingMode && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-border px-4 mb-6">
              {["NDVI", "Tuproq", "Ob-havo", "AI Tahlil"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAnalysisTab(tab)}
                  className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${analysisTab === tab ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Tab Content */}
        {!isDrawingMode && analysisTab === "NDVI" && (
          <div className="px-6 pb-8">
            {analysisResult ? (
              <>
                <div className="text-center mb-8">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Joriy NDVI
                  </p>
                  <h2 className="text-7xl font-black text-primary mb-2">
                    {analysisResult.ndvi?.current?.toFixed(3) || "0.000"}
                  </h2>
                  <p className="text-[10px] text-muted-foreground mb-4">
                    {analysisResult.analysis?.ndvi_baho ||
                      "Normalized Difference Vegetation Index"}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    {analysisResult.ndvi?.change !== undefined && (
                      <div className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-full border border-primary/20 flex items-center gap-1">
                        {analysisResult.ndvi.change >= 0 ? "↑" : "↓"}{" "}
                        {analysisResult.ndvi.change >= 0 ? "+" : ""}
                        {analysisResult.ndvi.change?.toFixed(3)}
                      </div>
                    )}
                    <div className="bg-gray-100 text-muted-foreground text-[10px] font-bold px-3 py-1 rounded-full border border-border">
                      {new Date().toISOString().slice(0, 7)}
                    </div>
                  </div>
                </div>

                {/* NDVI Scale */}
                <div className="mb-8">
                  <div className="h-2 w-full rounded-full bg-gray-100 relative">
                    {analysisResult.ndvi?.current !== undefined && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-4 border-primary rounded-full shadow-lg transition-all"
                        style={{
                          left: `${Math.max(0, Math.min(100, ((analysisResult.ndvi.current + 0.1) / 1.1) * 100))}%`,
                        }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] font-mono text-muted-foreground">
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
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    NDVI Trend (Oylik)
                  </p>
                  <div className="h-48 w-full bg-gray-50 rounded-xl p-2 border border-border flex items-center justify-center">
                    {analysisResult.ndvi?.monthly &&
                    analysisResult.ndvi.monthly.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analysisResult.ndvi.monthly}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(0,0,0,0.05)"
                          />
                          <XAxis
                            dataKey="month"
                            fontSize={10}
                            stroke="rgba(0,0,0,0.4)"
                            tickFormatter={(v) => v.split("-")[1]}
                          />
                          <YAxis
                            fontSize={10}
                            stroke="rgba(0,0,0,0.4)"
                            domain={[-0.1, 1]}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "1px solid rgba(0,0,0,0.1)",
                              borderRadius: "12px",
                              fontSize: "10px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="ndvi"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            dot={{ r: 3, fill: "var(--primary)" }}
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
                      <p className="text-[10px] text-muted-foreground italic">
                        Trend ma'lumotlari mavjud emas
                      </p>
                    )}
                  </div>
                </div>

                {/* Drought Index Slider */}
                <div className="mb-8">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    Qurg'oqchilik indeksi (DI)
                  </p>
                  <div className="bg-gray-50 rounded-xl p-4 border border-border">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-bold text-muted-foreground">
                        Juda quruq ⟷ Nam
                      </span>
                      <span
                        className={`text-xs font-bold ${analysisResult.ndvi?.drought_index < 0 ? "text-orange-500" : "text-blue-500"}`}
                      >
                        {analysisResult.ndvi?.drought_index?.toFixed(2) ||
                          "0.00"}{" "}
                        {analysisResult.analysis?.qurgochlik}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full relative overflow-hidden">
                      <div
                        className="absolute h-full bg-primary rounded-full transition-all"
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

        {!isDrawingMode && analysisTab === "Tuproq" && (
          <div className="px-6 pb-8">
            {analysisResult?.soil ? (
              <div className="flex flex-col gap-6">
                <div className="bg-gray-50 rounded-2xl p-5 border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    Tuproq xususiyatlari
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        pH darajasi
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        {analysisResult.soil.properties?.ph_h2o?.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        Organik uglerod
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {analysisResult.soil.properties?.soc?.toFixed(1)} g/kg
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        Azot miqdori
                      </span>
                      <span className="text-lg font-bold text-purple-600">
                        {analysisResult.soil.properties?.nitrogen} mg/kg
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        Zichlik (BDOD)
                      </span>
                      <span className="text-lg font-bold text-orange-600">
                        {analysisResult.soil.properties?.bdod} kg/m³
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-5 border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    Tarkibi (%)
                  </p>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Qum (Sand)</span>
                      <span className="font-bold text-foreground">
                        {analysisResult.soil.properties?.sand}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500"
                        style={{
                          width: `${analysisResult.soil.properties?.sand}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-2">
                      <span className="text-muted-foreground">Loy (Clay)</span>
                      <span className="font-bold text-foreground">
                        {analysisResult.soil.properties?.clay}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{
                          width: `${analysisResult.soil.properties?.clay}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-2">
                      <span className="text-muted-foreground">Silt</span>
                      <span className="font-bold text-foreground">
                        {analysisResult.soil.properties?.silt}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
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
                  <div className="bg-gray-50 rounded-xl p-4 border border-border flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Thermometer className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Yuza temp.</p>
                      <p className="text-sm font-bold text-foreground">
                        {analysisResult.soil.surface_temp}°C
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-border flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Droplets className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        Namlik (0-1cm)
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {analysisResult.soil.moisture_0_1cm}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Map className="w-8 h-8 mb-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">
                  Ma'lumotlar yuklanmoqda...
                </p>
              </div>
            )}
          </div>
        )}

        {!isDrawingMode && analysisTab === "Ob-havo" && (
          <div className="px-6 pb-8">
            {analysisResult?.weather ? (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-2xl p-5 border border-border text-center">
                    <Thermometer className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                    <p className="text-[10px] text-muted-foreground uppercase">
                      O'rtacha harorat
                    </p>
                    <p className="text-2xl font-black text-foreground">
                      {analysisResult.weather.avg_temp}°C
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-5 border border-border text-center">
                    <CloudRain className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Yillik yog'in
                    </p>
                    <p className="text-2xl font-black text-foreground">
                      {analysisResult.weather.annual_precip} mm
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-5 border border-border text-center">
                    <Wind className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Shamol tezligi
                    </p>
                    <p className="text-2xl font-black text-foreground">
                      {analysisResult.weather.avg_wind} m/s
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-5 border border-border text-center">
                    <Droplets className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Namlik
                    </p>
                    <p className="text-2xl font-black text-foreground">
                      {analysisResult.weather.avg_humidity}%
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-5 border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    Yog'ingarchilik trendi (Monthly)
                  </p>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analysisResult.weather.monthly}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(0,0,0,0.05)"
                        />
                        <XAxis
                          dataKey="month"
                          fontSize={10}
                          stroke="rgba(0,0,0,0.4)"
                          tickFormatter={(v) => v.split("-")[1]}
                        />
                        <YAxis fontSize={10} stroke="rgba(0,0,0,0.4)" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            border: "1px solid rgba(0,0,0,0.1)",
                            borderRadius: "12px",
                            fontSize: "10px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
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
                <Map className="w-8 h-8 mb-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">
                  Ma'lumotlar yuklanmoqda...
                </p>
              </div>
            )}
          </div>
        )}

        {!isDrawingMode && analysisTab === "AI Tahlil" && (
          <div className="px-6 pb-8">
            {analysisResult?.analysis ? (
              <div className="flex flex-col gap-6">
                {/* Summary Banner */}
                <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">AI Xulosa</h3>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        {analysisResult.source}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/80 italic">
                    "{analysisResult.analysis.xulosa}"
                  </p>
                </div>

                {/* Status Sections */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Sprout className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                        O'simlik holati
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {analysisResult.analysis.osimlik_holati}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Map className="w-4 h-4 text-orange-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Tuproq tahlili
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {analysisResult.analysis.tuproq_tahlili}
                    </p>
                  </div>
                </div>

                {/* Priority Actions */}
                <div>
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                    Ustuvor harakatlar
                  </h4>
                  <div className="flex flex-col gap-2">
                    {analysisResult.analysis.ustuvor_harakatlar?.map(
                      (item: string, i: number) => (
                        <div
                          key={i}
                          className="bg-gray-50 rounded-xl p-3 flex items-start gap-3 border border-border"
                        >
                          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-xs text-foreground/80">{item}</p>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* Risks */}
                <div>
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                    Mumkin bo'lgan xavflar
                  </h4>
                  <div className="flex flex-col gap-2">
                    {analysisResult.analysis.xavflar?.map(
                      (item: string, i: number) => (
                        <div
                          key={i}
                          className="bg-red-50 rounded-xl p-3 flex items-start gap-3 border border-red-100"
                        >
                          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground/80">{item}</p>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="w-4 h-4 text-yellow-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Dehqonchilik maslahatlari
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {analysisResult.analysis.dehqonchilik_maslahati?.map(
                      (item: string, i: number) => (
                        <li
                          key={i}
                          className="text-xs text-muted-foreground flex gap-2"
                        >
                          <span className="text-yellow-600 mt-1">•</span>
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Map className="w-8 h-8 mb-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Tahlil o'tkazilmagan</p>
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
                  {f.crop} • {f.area_sotix} sotix
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditField(f);
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors flex-shrink-0"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
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
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-green-800 truncate">
                  {activeField.name}
                </p>
                <p className="text-xs text-green-600">
                  {activeField.area_sotix} sotix •{" "}
                  {(activeField.area_ha * 10000).toLocaleString()} m²
                </p>
              </div>
            </div>
            <button
              onClick={() => handleEditField(activeField)}
              className="p-2 rounded-lg bg-white border border-green-200 text-green-700 hover:bg-green-100 transition-all flex items-center gap-1.5 text-xs font-bold"
            >
              <Edit className="w-3.5 h-3.5" />
              Tahrirlash
            </button>
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
        onClick={handleStartDrawing}
        className="flex-1 py-3 rounded-xl font-semibold text-sm bg-green-100 text-green-700 hover:bg-green-200 transition-all flex items-center justify-center gap-2 shadow-sm"
      >
        <Plus className="w-4 h-4" /> Yangi dala chizish
      </button>
    </div>
  );

  // ── Desktop layout ─────────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Chap panel olib tashlandi */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <MapboxFieldMap
            ref={mapboxRef}
            savedFields={savedFields}
            activeFieldId={activeFieldId}
            onPolygonChange={handlePolygonChange}
            onAreaChange={handleAreaChange}
            onFieldClick={handleFieldClick}
          />
          {draftPolygon && draftArea.m2 > 0 && !isDrawingMode && (
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
    );
  }

  // ── Mobile layout ──────────────────────────────────────────────────────────
  return (
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
              onClick={() => setMobileView("analysis")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${mobileView === "analysis" ? "bg-white text-green-700 shadow" : "text-gray-500"}`}
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
    );
  }

