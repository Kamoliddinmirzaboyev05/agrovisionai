import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Map,
  MapPin,
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
  Calendar,
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

import { fieldService } from "../services/fieldService";
import { ensureCsrfToken } from "@/lib/api";

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
        const data = await fieldService.getFields();
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
  const [lastIrrigation, setLastIrrigation] = useState<string>(new Date().toISOString().split('T')[0]);
  const [waterCycle, setWaterCycle] = useState<number>(7);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);

  // Analysis panel state
  const [analysisTab, setAnalysisTab] = useState("AI Tahlil");
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
    if (isMobile) setMobileView("map");
    // Small delay to ensure state is set before drawing starts
    setTimeout(() => {
      mapboxRef.current?.startDrawing();
    }, 50);
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
      last_irrigation: lastIrrigation,
      water_cycle: waterCycle,
      notes: "",
    };

    try {
      let savedField: SavedField;
      if (editingFieldId) {
        savedField = await fieldService.updateField(editingFieldId, payload);
        setSavedFields((prev) => prev.map(f => f.id === editingFieldId ? savedField : f));
      } else {
        savedField = await fieldService.createField(payload);
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

      // Auto-switch to analysis view on mobile
      if (isMobile) setMobileView("analysis");
    } catch (err: any) {
      console.error("Save field failed:", err);
      alert(err.message || "Dalani saqlashda xatolik yuz berdi.");
    }
  };

  const handleEditField = (field: SavedField) => {
    setEditingFieldId(field.id);
    setFieldName(field.name);
    setCrop(field.crop);
    if (field.last_irrigation) setLastIrrigation(field.last_irrigation);
    if (field.water_cycle) setWaterCycle(field.water_cycle);
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
    // If on mobile, switch to analysis view to show fields list
    if (isMobile) setMobileView("analysis");
  };

  const handleDeleteField = async (id: number) => {
    if (!confirm("Haqiqatan ham ushbu dalani o'chirmoqchimisiz?")) return;
    try {
      await fieldService.deleteField(id);
      const updated = savedFields.filter((f) => f.id !== id);
      setSavedFields(updated);
      if (activeFieldId === id) setActiveFieldId(updated[0]?.id ?? null);
    } catch (err: any) {
      console.error("Delete field failed:", err);
      alert(err.message || "Dalani o'chirishda xatolik yuz berdi.");
    }
  };

  const handleFieldClick = useCallback(
    (id: number) => {
      setActiveFieldId(id);
      const field = savedFields.find(f => f.id === id);
      if (field) {
        if (field.last_irrigation) setLastIrrigation(field.last_irrigation);
        if (field.water_cycle) setWaterCycle(field.water_cycle);
      }
      if (isMobile) setMobileView("analysis");
    },
    [isMobile, savedFields],
  );

  const handleStartAnalysis = async () => {
    if (!activeField) return;
    try {
      setIsAnalyzing(true);
      // Ensure CSRF token is available before posting
      await ensureCsrfToken();
      const data = await fieldService.analyzeField({
        coordinates: activeField.coordinates,
        area_ha: activeField.area_ha,
        save: false,
        name: activeField.name,
        last_irrigation: lastIrrigation,
        water_cycle: waterCycle,
      });
      setAnalysisResult(data);
    } catch (err: any) {
      console.error("Analysis failed:", err);
      const msg = err?.detail || err?.message || err?.error || "Tahlil jarayonida xatolik yuz berdi.";
      alert(msg);
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
                  <span>Maydon nomini kiriting</span>
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

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleCancelDrawing}
                    className="flex-1 py-3 rounded-xl border-2 border-border text-muted-foreground font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={handleSaveField}
                    disabled={!fieldName.trim()}
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
                  "🛰️ Ma'lumotlarni tahlil qilish"
                )}
              </button>
            </div>
          </>
        )}

        {!isDrawingMode && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-border px-4 mb-6 overflow-x-auto no-scrollbar">
              {["AI Tahlil", "NDVI", "Tuproq", "Ob-havo", "Suv"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAnalysisTab(tab)}
                  className={`flex-shrink-0 px-4 py-3 text-xs font-bold transition-all border-b-2 ${analysisTab === tab ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Tab Content */}
        {!isDrawingMode && analysisTab === "NDVI" && (
          <div className="px-6 pb-8 space-y-6">
            {analysisResult ? (
              <>
                <div className="text-center bg-gray-50 rounded-3xl p-8 border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Joriy NDVI (O'simlik zichligi)
                  </p>
                  <h2 className="text-7xl font-black text-primary mb-2">
                    {analysisResult.ndvi?.current?.toFixed(3) || "0.000"}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    {analysisResult.ndvi?.change !== undefined && (
                      <div className={`text-[10px] font-bold px-3 py-1 rounded-full border flex items-center gap-1 ${analysisResult.ndvi.change >= 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                        {analysisResult.ndvi.change >= 0 ? "↑" : "↓"} {Math.abs(analysisResult.ndvi.change).toFixed(3)} (o'tgan oyga nisbatan)
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    {analysisResult.analysis?.ndvi_baho || "Normalized Difference Vegetation Index"}
                  </p>
                </div>

                {/* NDVI Scale */}
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                    <span>O'simliksiz</span>
                    <span>Zich o'simlik</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-gradient-to-r from-red-200 via-yellow-200 to-green-500 relative">
                    {analysisResult.ndvi?.current !== undefined && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-4 border-primary rounded-full shadow-xl transition-all duration-1000"
                        style={{
                          left: `${Math.max(0, Math.min(100, ((analysisResult.ndvi.current + 0.1) / 1.1) * 100))}%`,
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Drought & Water Stress */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100">
                    <p className="text-[10px] font-bold text-orange-700 uppercase mb-2">Qurg'oqchilik (DI)</p>
                    <p className="text-xl font-black text-orange-900">{analysisResult.ndvi?.drought_index?.toFixed(2) || "0.00"}</p>
                    <p className="text-[9px] text-orange-600 font-medium mt-1">{analysisResult.analysis?.qurgochlik || "O'rtacha"}</p>
                  </div>
                  <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-700 uppercase mb-2">Suv stressi (NDWI)</p>
                    <p className="text-xl font-black text-blue-900">{analysisResult.ndvi?.ndwi_current?.toFixed(2) || "N/A"}</p>
                    <p className="text-[9px] text-blue-600 font-medium mt-1">Suv miqdori</p>
                  </div>
                </div>

                {/* Trend Chart */}
                <div className="bg-white rounded-2xl p-5 border border-border">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">NDVI Trend</h4>
                    <span className="text-[10px] text-muted-foreground font-mono bg-gray-100 px-2 py-1 rounded">Sentinel-2 Data</span>
                  </div>
                  <div className="h-48 w-full">
                    {analysisResult.ndvi?.monthly && analysisResult.ndvi.monthly.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analysisResult.ndvi.monthly}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                          <XAxis 
                            dataKey="month" 
                            fontSize={10} 
                            stroke="rgba(0,0,0,0.4)" 
                            tickFormatter={(v) => v.split("-")[1]} 
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis 
                            fontSize={10} 
                            stroke="rgba(0,0,0,0.4)" 
                            domain={[-0.1, 1]} 
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "none",
                              borderRadius: "12px",
                              fontSize: "10px",
                              boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="ndvi"
                            stroke="var(--primary)"
                            strokeWidth={3}
                            dot={{ r: 4, fill: "var(--primary)", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground italic">
                        Ma'lumotlar mavjud emas
                      </div>
                    )}
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
          <div className="px-6 pb-8 space-y-6">
            {analysisResult?.soil ? (
              <div className="flex flex-col gap-6">
                {/* 1. Haroratlar */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-orange-50 rounded-2xl p-3 border border-orange-100 text-center">
                    <Thermometer className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                    <p className="text-[8px] text-orange-700 uppercase font-bold">Yuza</p>
                    <p className="text-lg font-black text-orange-900">{analysisResult.soil.surface_temp}°C</p>
                  </div>
                  <div className="bg-orange-50 rounded-2xl p-3 border border-orange-100 text-center">
                    <Thermometer className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                    <p className="text-[8px] text-orange-700 uppercase font-bold">6cm</p>
                    <p className="text-lg font-black text-orange-900">{analysisResult.soil.depth_6cm_temp}°C</p>
                  </div>
                  <div className="bg-orange-50 rounded-2xl p-3 border border-orange-100 text-center">
                    <Thermometer className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                    <p className="text-[8px] text-orange-700 uppercase font-bold">18cm</p>
                    <p className="text-lg font-black text-orange-900">{analysisResult.soil.depth_18cm_temp}°C</p>
                  </div>
                </div>

                {/* 2. Namlik darajalari */}
                <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <Droplets className="w-4 h-4" /> Namlik darajasi (qatlamlar bo'yicha)
                  </h4>
                  <div className="space-y-4">
                    {[
                      { label: "0-1 cm", val: analysisResult.soil.moisture_0_1cm, label_uz: analysisResult.soil.properties?.gwet_top_label },
                      { label: "1-3 cm", val: analysisResult.soil.moisture_1_3cm },
                      { label: "3-9 cm", val: analysisResult.soil.moisture_3_9cm },
                      { label: "9-27 cm", val: analysisResult.soil.moisture_9_27cm, label_uz: analysisResult.soil.properties?.gwet_root_label },
                    ].map((m, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-blue-800">{m.label}</span>
                          <span className="text-blue-600">{m.val}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                            style={{ width: `${m.val}%` }}
                          />
                        </div>
                        {m.label_uz && (
                          <p className="text-[9px] text-blue-700/60 italic">{m.label_uz}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Tuproq xususiyatlari (Agar mavjud bo'lsa) */}
                {analysisResult.soil.properties?.soilgrids_ok && (
                  <div className="bg-gray-50 rounded-2xl p-5 border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
                      Kimyoviy va fizik tarkibi
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground">pH darajasi</span>
                        <span className="text-sm font-bold text-blue-600">
                          {analysisResult.soil.properties?.ph_h2o?.toFixed(1) || "N/A"} ({analysisResult.soil.properties?.ph_label})
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground">Organik uglerod</span>
                        <span className="text-sm font-bold text-primary">
                          {analysisResult.soil.properties?.soc?.toFixed(1) || "N/A"} g/kg
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground">Azot miqdori</span>
                        <span className="text-sm font-bold text-purple-600">
                          {analysisResult.soil.properties?.nitrogen || "N/A"} mg/kg
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground">Tuzilishi (Texture)</span>
                        <span className="text-sm font-bold text-orange-600">
                          {analysisResult.soil.properties?.texture || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Shamol va Atrof-muhit */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <Wind className="w-5 h-5 text-teal-600" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Shamol tezligi</p>
                      <p className="text-sm font-bold text-foreground">{analysisResult.soil.wind_speed} m/s</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase">Havoning namligi</p>
                    <p className="text-sm font-bold text-foreground">{analysisResult.soil.humidity}%</p>
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
          <div className="px-6 pb-8 space-y-6">
            {analysisResult?.weather ? (
              <div className="flex flex-col gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl p-6 text-white shadow-lg">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest">O'rtacha harorat</p>
                      <h2 className="text-5xl font-black">{analysisResult.weather.avg_temp}°C</h2>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                      <CloudRain className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                      <p className="text-[9px] text-blue-100 uppercase font-bold mb-1">Yillik yog'in</p>
                      <p className="text-lg font-bold">{analysisResult.weather.annual_precip} mm</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                      <p className="text-[9px] text-blue-100 uppercase font-bold mb-1">Namlik</p>
                      <p className="text-lg font-bold">{analysisResult.weather.avg_humidity}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-border">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Mavsumiy o'zgarish</h4>
                    <div className="flex gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-[8px] font-bold text-muted-foreground">Yog'in</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="text-[8px] font-bold text-muted-foreground">Harorat</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analysisResult.weather.monthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                        <XAxis 
                          dataKey="month" 
                          fontSize={10} 
                          stroke="rgba(0,0,0,0.4)" 
                          tickFormatter={(v) => v.split("-")[1]} 
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis fontSize={10} stroke="rgba(0,0,0,0.4)" axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            border: "none",
                            borderRadius: "12px",
                            fontSize: "10px",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="precip"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ r: 3, fill: "#3b82f6" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="temp"
                          stroke="#f97316"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "#f97316" }}
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 border border-border flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Wind className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">O'rtacha shamol tezligi</p>
                    <p className="text-sm font-bold text-foreground">{analysisResult.weather.avg_wind} m/s</p>
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
          <div className="px-6 pb-8 space-y-6">
            {analysisResult?.analysis ? (
              <>
                {/* 1. Xulosa va Asosiy tavsiya */}
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
                  <p className="text-sm leading-relaxed text-foreground/80 italic mb-4">
                    "{analysisResult.analysis.xulosa}"
                  </p>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-primary/5">
                    <p className="text-[10px] font-bold text-primary uppercase mb-2">Eng foydali ekin:</p>
                    <p className="text-sm font-bold text-foreground">
                      {analysisResult.analysis.eng_foydali_ekin}
                    </p>
                  </div>
                </div>

                {/* 2. Bugun nima qilish kerak? (Priority) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2 px-1">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Bugun nima qilish kerak?
                  </h4>
                  <div className="flex flex-col gap-2">
                    {analysisResult.analysis.bugun_nima_qilish?.map((item: string, i: number) => (
                      <div key={i} className="bg-green-50/50 rounded-xl p-3 border border-green-100 flex gap-3">
                        <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-xs text-foreground/80 leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Ekin Tavsiyalari */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2 px-1">
                    <Sprout className="w-4 h-4 text-primary" />
                    Ekin tavsiyalari
                  </h4>
                  <div className="flex flex-col gap-3">
                    {analysisResult.analysis.ekin_tavsiyalari?.map((item: any, i: number) => (
                      <div key={i} className="bg-gray-50 rounded-2xl p-4 border border-border hover:border-primary/30 transition-all group">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                              {item.ekin}
                            </h5>
                            <p className="text-[10px] text-muted-foreground">{item.nima_uchun_mos}</p>
                          </div>
                          <div className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-lg">
                            {item.hosil_tonnada}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-white rounded-lg p-2 border border-border/50">
                            <p className="text-[8px] text-muted-foreground uppercase">Sof foyda</p>
                            <p className="text-xs font-bold text-green-600">{item.sof_foyda}</p>
                          </div>
                          <div className="bg-white rounded-lg p-2 border border-border/50">
                            <p className="text-[8px] text-muted-foreground uppercase">Ekish vaqti</p>
                            <p className="text-xs font-bold text-foreground">{item.ekish_vaqti}</p>
                          </div>
                        </div>
                        <div className="bg-red-50 rounded-xl p-2.5 border border-red-100/50">
                          <p className="text-[8px] text-red-600 font-bold uppercase flex items-center gap-1 mb-1">
                            <AlertTriangle className="w-3 h-3" /> Asosiy xavf
                          </p>
                          <p className="text-[10px] text-red-800">{item.asosiy_xavf}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Sug'orish va O'g'itlash rejalari */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
                    <div className="flex items-center gap-2 mb-4">
                      <Droplets className="w-5 h-5 text-blue-600" />
                      <h4 className="text-sm font-bold text-blue-900">Sug'orish rejasi</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-blue-700/60">Manba:</span>
                        <span className="font-bold text-blue-900">{analysisResult.analysis.sugorish_rejasi?.manba}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-blue-700/60">Chastota:</span>
                        <span className="font-bold text-blue-900">{analysisResult.analysis.sugorish_rejasi?.chastota}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-blue-700/60">Usul:</span>
                        <span className="font-bold text-blue-900">{analysisResult.analysis.sugorish_rejasi?.usul}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-100">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-5 h-5 text-amber-600" />
                      <h4 className="text-sm font-bold text-amber-900">O'g'itlash rejasi</h4>
                    </div>
                    <div className="space-y-2">
                      {analysisResult.analysis.ogit_rejasi?.map((item: string, i: number) => (
                        <p key={i} className="text-xs text-amber-900/80 leading-relaxed">• {item}</p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 5. Xavflar va Ehtiyot choralari */}
                 <div className="space-y-3">
                   <h4 className="text-xs font-bold text-foreground px-1">Xavflar va ehtiyot choralari</h4>
                   <div className="flex flex-col gap-2">
                     {analysisResult.analysis.xavflar?.map((item: string, i: number) => (
                       <div key={i} className="bg-red-50 rounded-xl p-3 border border-red-100 flex items-start gap-3">
                         <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                         <p className="text-xs text-red-900/80">{item}</p>
                       </div>
                     ))}
                   </div>
                 </div>

                 {/* 6. Yillik Reja */}
                 <div className="bg-gray-50 rounded-2xl p-5 border border-border">
                   <h4 className="text-xs font-bold text-foreground mb-4 flex items-center gap-2">
                     <Calendar className="w-4 h-4 text-primary" /> Yillik ish rejasi
                   </h4>
                   <div className="space-y-3">
                     {analysisResult.analysis.yillik_reja && Object.entries(analysisResult.analysis.yillik_reja).map(([period, task]: [string, any], i: number) => (
                       <div key={i} className="flex gap-3">
                         <div className="w-16 flex-shrink-0">
                           <p className="text-[10px] font-bold text-primary uppercase">{period.replace('_', ' ')}</p>
                         </div>
                         <div className="flex-1">
                           <p className="text-[11px] text-muted-foreground leading-relaxed">{task}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Map className="w-8 h-8 mb-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Tahlil o'tkazilmagan</p>
              </div>
            )}
          </div>
        )}

        {!isDrawingMode && analysisTab === "Suv" && (
          <div className="px-6 pb-8 space-y-6">
            {analysisResult?.water ? (
              <>
                <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Droplets className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Suv Manbalari</h3>
                      <p className="text-[10px] text-white/60 uppercase tracking-widest">Atrofdagi gidrologiya</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-white/90 font-medium">
                    {analysisResult.water.summary?.plain_text}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-foreground px-1">Yaqin atrofdagi manbalar</h4>
                  <div className="flex flex-col gap-2">
                    {analysisResult.water.sources?.map((source: any, i: number) => (
                      <div key={i} className="bg-white rounded-xl p-4 border border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${source.irrigation_ok ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{source.name}</p>
                            <p className="text-[10px] text-muted-foreground">{source.type_uz} • {source.direction}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-blue-600">{source.distance_text}</p>
                          {source.irrigation_ok && (
                            <span className="text-[8px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">Sug'orishga mos</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Droplets className="w-8 h-8 mb-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Suv ma'lumotlari mavjud emas</p>
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
  // Mobile analysis panel - shows drawing mode form OR analysis tabs/results
  const mobileAnalysisContent = isDrawingMode ? (
    <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
      {/* Drawing Mode Instructions */}
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
            <span>Kamida 3 ta nuqta bo'lgach, "Tugatish" tugmasini bosing yoki birinchi nuqtaga bosing.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <span>Maydon nomini kiriting</span>
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
              <span className="text-xs text-muted-foreground">Kvadrat metr:</span>
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
                    <span className="text-primary/40 font-bold">{idx + 1}</span>
                    <span className="text-primary/80">
                      {coord[1].toFixed(6)}, {coord[0].toFixed(6)}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 mt-4">
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
                Ekin turi
              </label>
              <div className="relative">
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="w-full bg-input-background border border-border rounded-xl px-4 py-3 text-foreground appearance-none font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Ekin tanlang</option>
                  {CROPS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
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
        </div>
      ) : (
        <div className="bg-gray-50 border-2 border-dashed border-border rounded-xl p-6 text-center">
          <Map className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground font-medium">
            Xaritada hudud belgilang
          </p>
        </div>
      )}
    </div>
  ) : (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* If no field selected, show fields list */}
      {!activeField ? (
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <button
            onClick={handleStartDrawing}
            className="w-full py-4 rounded-xl bg-primary hover:opacity-90 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all mb-4"
          >
            <Plus className="w-5 h-5" />
            Maydon belgilash
          </button>
          {fieldsList}
        </div>
      ) : (
        <>
          {/* Active field info + analysis button */}
          <div className="flex-shrink-0 px-4 pt-3 pb-2 border-b border-border">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Sprout className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-green-800 truncate">
                      {activeField.name}
                    </p>
                    <p className="text-xs text-green-600">
                      {activeField.crop} • {activeField.area_sotix.toFixed(1)} sotix
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setMobileView("map"); handleEditField(activeField); }}
                  className="p-2 rounded-lg bg-white border border-green-200 text-green-700 hover:bg-green-100 transition-all flex items-center gap-1 text-xs font-bold"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Tahrir
                </button>
              </div>
            </div>
          </div>

          {/* Action Button - Tahlil */}
          <div className="flex-shrink-0 px-4 pt-3 pb-2">
            <button
              onClick={handleStartAnalysis}
              disabled={isAnalyzing}
              className="w-full py-4 rounded-xl bg-primary hover:opacity-90 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
            >
              {isAnalyzing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : analysisResult ? (
                "🔄 Qayta tahlil qilish"
              ) : (
                "🛰️ Ma'lumotlarni tahlil qilish"
              )}
            </button>
          </div>

          {/* Tabs */}
          {!isDrawingMode && (
            <div className="flex-shrink-0 flex border-b border-border px-4 overflow-x-auto no-scrollbar">
              {["AI Tahlil", "NDVI", "Tuproq", "Ob-havo", "Suv"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAnalysisTab(tab)}
                  className={`flex-shrink-0 px-3 py-2.5 text-xs font-bold transition-all border-b-2 ${analysisTab === tab ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {/* Tab Content - scrollable */}
          <div className="flex-1 overflow-y-auto pb-6">
            {analysisTab === "NDVI" && (
              <div className="px-4 pt-4 space-y-5">
                {analysisResult ? (
                  <>
                    <div className="text-center bg-gray-50 rounded-3xl p-6 border border-border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                        Joriy NDVI
                      </p>
                      <h2 className="text-5xl font-black text-primary mb-2">
                        {analysisResult.ndvi?.current?.toFixed(3) || "0.000"}
                      </h2>
                      {analysisResult.ndvi?.change !== undefined && (
                        <div className={`text-[10px] font-bold px-3 py-1 rounded-full border inline-flex items-center gap-1 ${analysisResult.ndvi.change >= 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                          {analysisResult.ndvi.change >= 0 ? "↑" : "↓"} {Math.abs(analysisResult.ndvi.change).toFixed(3)}
                        </div>
                      )}
                    </div>

                    {/* NDVI Scale */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                        <span>O'simliksiz</span>
                        <span>Zich o'simlik</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-gradient-to-r from-red-200 via-yellow-200 to-green-500 relative">
                        {analysisResult.ndvi?.current !== undefined && (
                          <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-4 border-primary rounded-full shadow-xl transition-all duration-1000"
                            style={{ left: `${Math.max(0, Math.min(100, ((analysisResult.ndvi.current + 0.1) / 1.1) * 100))}%` }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Drought & Water Stress */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-orange-50/50 rounded-2xl p-3 border border-orange-100">
                        <p className="text-[9px] font-bold text-orange-700 uppercase mb-1">Qurg'oqchilik (DI)</p>
                        <p className="text-lg font-black text-orange-900">{analysisResult.ndvi?.drought_index?.toFixed(2) || "0.00"}</p>
                      </div>
                      <div className="bg-blue-50/50 rounded-2xl p-3 border border-blue-100">
                        <p className="text-[9px] font-bold text-blue-700 uppercase mb-1">Suv stressi (NDWI)</p>
                        <p className="text-lg font-black text-blue-900">{analysisResult.ndvi?.ndwi_current?.toFixed(2) || "N/A"}</p>
                      </div>
                    </div>

                    {/* Trend Chart */}
                    <div className="bg-white rounded-2xl p-4 border border-border">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">NDVI Trend</h4>
                      <div className="h-40 w-full">
                        {analysisResult.ndvi?.monthly && analysisResult.ndvi.monthly.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analysisResult.ndvi.monthly}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                              <XAxis dataKey="month" fontSize={10} stroke="rgba(0,0,0,0.4)" tickFormatter={(v) => v.split("-")[1]} axisLine={false} tickLine={false} />
                              <YAxis fontSize={10} stroke="rgba(0,0,0,0.4)" domain={[-0.1, 1]} axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "none", borderRadius: "12px", fontSize: "10px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }} />
                              <Line type="monotone" dataKey="ndvi" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--primary)", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, strokeWidth: 0 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground italic">Ma'lumotlar mavjud emas</div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center opacity-40">
                    <Map className="w-10 h-10 mb-3" />
                    <p className="text-xs font-medium max-w-[200px] leading-relaxed">Tahlil qilish tugmasini bosing</p>
                  </div>
                )}
              </div>
            )}

            {analysisTab === "Tuproq" && (
              <div className="px-4 pt-4 space-y-4">
                {analysisResult?.soil ? (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-orange-50 rounded-2xl p-3 border border-orange-100 text-center">
                        <Thermometer className="w-4 h-4 text-orange-600 mx-auto mb-1" />
                        <p className="text-[8px] text-orange-700 uppercase font-bold">Yuza</p>
                        <p className="text-base font-black text-orange-900">{analysisResult.soil.surface_temp}°C</p>
                      </div>
                      <div className="bg-orange-50 rounded-2xl p-3 border border-orange-100 text-center">
                        <Thermometer className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                        <p className="text-[8px] text-orange-700 uppercase font-bold">6cm</p>
                        <p className="text-base font-black text-orange-900">{analysisResult.soil.depth_6cm_temp}°C</p>
                      </div>
                      <div className="bg-orange-50 rounded-2xl p-3 border border-orange-100 text-center">
                        <Thermometer className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                        <p className="text-[8px] text-orange-700 uppercase font-bold">18cm</p>
                        <p className="text-base font-black text-orange-900">{analysisResult.soil.depth_18cm_temp}°C</p>
                      </div>
                    </div>
                    <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                      <h4 className="text-xs font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <Droplets className="w-4 h-4" /> Namlik darajasi
                      </h4>
                      <div className="space-y-3">
                        {[
                          { label: "0-1 cm", val: analysisResult.soil.moisture_0_1cm },
                          { label: "1-3 cm", val: analysisResult.soil.moisture_1_3cm },
                          { label: "3-9 cm", val: analysisResult.soil.moisture_3_9cm },
                          { label: "9-27 cm", val: analysisResult.soil.moisture_9_27cm },
                        ].map((m, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-blue-800">{m.label}</span>
                              <span className="text-blue-600">{m.val}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${m.val}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-border">
                      <div className="flex items-center gap-2">
                        <Wind className="w-4 h-4 text-teal-600" />
                        <div>
                          <p className="text-[9px] text-muted-foreground uppercase">Shamol</p>
                          <p className="text-sm font-bold text-foreground">{analysisResult.soil.wind_speed} m/s</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-muted-foreground uppercase">Namlik</p>
                        <p className="text-sm font-bold text-foreground">{analysisResult.soil.humidity}%</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center opacity-40">
                    <Map className="w-10 h-10 mb-3" />
                    <p className="text-xs font-medium">Ma'lumotlar yuklanmoqda...</p>
                  </div>
                )}
              </div>
            )}

            {analysisTab === "Ob-havo" && (
              <div className="px-4 pt-4 space-y-4">
                {analysisResult?.weather ? (
                  <div className="flex flex-col gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl p-5 text-white shadow-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[9px] text-blue-100 font-bold uppercase tracking-widest">O'rtacha harorat</p>
                          <h2 className="text-4xl font-black">{analysisResult.weather.avg_temp}°C</h2>
                        </div>
                        <CloudRain className="w-8 h-8 text-white/80" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                          <p className="text-[8px] text-blue-100 uppercase font-bold mb-1">Yillik yog'in</p>
                          <p className="text-base font-bold">{analysisResult.weather.annual_precip} mm</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                          <p className="text-[8px] text-blue-100 uppercase font-bold mb-1">Namlik</p>
                          <p className="text-base font-bold">{analysisResult.weather.avg_humidity}%</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-border">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Mavsumiy o'zgarish</h4>
                      <div className="h-36 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analysisResult.weather.monthly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                            <XAxis dataKey="month" fontSize={10} stroke="rgba(0,0,0,0.4)" tickFormatter={(v) => v.split("-")[1]} axisLine={false} tickLine={false} />
                            <YAxis fontSize={10} stroke="rgba(0,0,0,0.4)" axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "none", borderRadius: "12px", fontSize: "10px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }} />
                            <Line type="monotone" dataKey="precip" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: "#3b82f6" }} />
                            <Line type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: "#f97316" }} strokeDasharray="5 5" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center opacity-40">
                    <Map className="w-10 h-10 mb-3" />
                    <p className="text-xs font-medium">Ma'lumotlar yuklanmoqda...</p>
                  </div>
                )}
              </div>
            )}

            {analysisTab === "AI Tahlil" && (
              <div className="px-4 pt-4 space-y-4">
                {analysisResult?.analysis ? (
                  <>
                    <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                      <div className="flex items-center gap-3 mb-3">
                        <Zap className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-base text-foreground">AI Xulosa</h3>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/80 italic mb-3">"{analysisResult.analysis.xulosa}"</p>
                      <div className="bg-white/60 rounded-xl p-3 border border-primary/5">
                        <p className="text-[9px] font-bold text-primary uppercase mb-1">Eng foydali ekin:</p>
                        <p className="text-sm font-bold text-foreground">{analysisResult.analysis.eng_foydali_ekin}</p>
                      </div>
                    </div>

                    {analysisResult.analysis.bugun_nima_qilish?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          Bugun nima qilish kerak?
                        </h4>
                        {analysisResult.analysis.bugun_nima_qilish.map((item: string, i: number) => (
                          <div key={i} className="bg-green-50/50 rounded-xl p-3 border border-green-100 flex gap-2">
                            <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                            <p className="text-xs text-foreground/80">{item}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {analysisResult.analysis.ekin_tavsiyalari?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                          <Sprout className="w-4 h-4 text-primary" />
                          Ekin tavsiyalari
                        </h4>
                        {analysisResult.analysis.ekin_tavsiyalari.map((item: any, i: number) => (
                          <div key={i} className="bg-gray-50 rounded-2xl p-4 border border-border">
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-bold text-base text-foreground">{item.ekin}</h5>
                              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-lg">{item.hosil_tonnada}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mb-2">{item.nima_uchun_mos}</p>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div className="bg-white rounded-lg p-2 border border-border/50">
                                <p className="text-[8px] text-muted-foreground uppercase">Sof foyda</p>
                                <p className="text-xs font-bold text-green-600">{item.sof_foyda}</p>
                              </div>
                              <div className="bg-white rounded-lg p-2 border border-border/50">
                                <p className="text-[8px] text-muted-foreground uppercase">Ekish vaqti</p>
                                <p className="text-xs font-bold text-foreground">{item.ekish_vaqti}</p>
                              </div>
                            </div>
                            <div className="bg-red-50 rounded-xl p-2 border border-red-100/50">
                              <p className="text-[8px] text-red-600 font-bold uppercase flex items-center gap-1 mb-1">
                                <AlertTriangle className="w-3 h-3" /> Asosiy xavf
                              </p>
                              <p className="text-[10px] text-red-800">{item.asosiy_xavf}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center opacity-40">
                    <Map className="w-10 h-10 mb-3" />
                    <p className="text-xs font-medium">Tahlil o'tkazilmagan</p>
                  </div>
                )}
              </div>
            )}

            {analysisTab === "Suv" && (
              <div className="px-4 pt-4 space-y-4">
                {analysisResult?.water ? (
                  <>
                    <div className="bg-blue-600 rounded-2xl p-5 text-white">
                      <div className="flex items-center gap-3 mb-3">
                        <Droplets className="w-6 h-6 text-white" />
                        <h3 className="font-bold text-base">Suv Manbalari</h3>
                      </div>
                      <p className="text-sm leading-relaxed text-white/90">{analysisResult.water.summary?.plain_text}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-foreground">Yaqin atrofdagi manbalar</h4>
                      {analysisResult.water.sources?.map((source: any, i: number) => (
                        <div key={i} className="bg-white rounded-xl p-3 border border-border flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className={`w-4 h-4 ${source.irrigation_ok ? 'text-blue-600' : 'text-gray-400'}`} />
                            <div>
                              <p className="text-xs font-bold text-foreground">{source.name}</p>
                              <p className="text-[9px] text-muted-foreground">{source.distance_text}</p>
                            </div>
                          </div>
                          {source.irrigation_ok && (
                            <span className="text-[8px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">Mos</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center opacity-40">
                    <Droplets className="w-8 h-8 mb-3" />
                    <p className="text-xs font-medium">Suv ma'lumotlari mavjud emas</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

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
              {isDrawingMode ? "Chizish" : "Tahlil"}
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
          mobileAnalysisContent
        )}
      </div>
    );
  }

