import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { Map, Trash2, ChevronRight, ChevronDown, Pencil } from "lucide-react";
import {
  MapboxFieldMap,
  type MapboxFieldMapHandle,
} from "../components/MapboxFieldMap";
import { AreaDisplay } from "../components/AreaDisplay";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CROPS } from "@/constants";
import { ROUTES } from "@/router/routes";
import type { FieldData } from "@/types";

export function FieldPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const mapboxRef = useRef<MapboxFieldMapHandle>(null);

  const [polygon, setPolygon] =
    useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(null);
  const [area, setArea] = useState({ m2: 0, sotix: 0, hectare: 0 });
  const [crop, setCrop] = useState("Pomidor");
  const [lastIrrigation, setLastIrrigation] = useState("");
  const [waterCycle, setWaterCycle] = useState("7");

  const handlePolygonChange = useCallback(
    (geojson: GeoJSON.Feature<GeoJSON.Polygon> | null) => setPolygon(geojson),
    [],
  );
  const handleAreaChange = useCallback(
    (a: { m2: number; sotix: number; hectare: number }) => setArea(a),
    [],
  );

  const handleStartDrawing = () => mapboxRef.current?.startDrawing();
  const handleClear = () => mapboxRef.current?.clearPolygon();

  const handleNext = () => {
    if (!polygon) {
      alert("Avval dala maydonini xaritada belgilang.");
      return;
    }
    if (area.m2 < 100) {
      alert("Maydon juda kichik (min 100 m²). Iltimos aniqroq belgilang.");
      return;
    }

    const fieldData: FieldData = {
      points: polygon.geometry.coordinates[0].map(([lng, lat]) => ({
        lat,
        lng,
      })),
      crop,
      lastIrrigation,
      waterCycle,
    };

    sessionStorage.setItem("fieldData", JSON.stringify(fieldData));
    navigate(ROUTES.UPLOAD);
  };

  const drawButtonLabel = polygon ? "Maydonni tahrirlash" : "Maydonni chizish";
  const drawButtonActive = !!polygon;

  // ── Form section (shared between desktop & mobile) ──
  const formSection = (
    <div className="flex flex-col gap-3">
      {/* Crop select */}
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

      {/* Date + cycle */}
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

      {/* Next button */}
      <button
        onClick={handleNext}
        disabled={!polygon}
        className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-base mt-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        Keyingi bosqich
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );

  // ── Map action buttons ──
  const mapActions = (
    <div className="flex gap-2">
      <button
        onClick={handleStartDrawing}
        className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md ${
          drawButtonActive
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-green-100 text-green-700 hover:bg-green-200"
        }`}
      >
        {drawButtonActive ? (
          <Pencil className="w-4 h-4" />
        ) : (
          <Map className="w-4 h-4" />
        )}
        {drawButtonLabel}
      </button>
      <button
        onClick={handleClear}
        disabled={!polygon}
        className="p-3.5 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
        title="Tozalash"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );

  // ── Desktop layout ──
  if (!isMobile) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-8 pt-6 pb-4">
          <h2 className="text-2xl font-bold text-foreground">Dala Xaritasi</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Maydoningizni xaritada belgilang va ekin ma'lumotlarini kiriting
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 flex gap-6 px-8 pb-8 overflow-hidden">
          {/* Map column */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <div className="relative flex-1 rounded-2xl overflow-hidden shadow-lg border border-border">
              <MapboxFieldMap
                ref={mapboxRef}
                onPolygonChange={handlePolygonChange}
                onAreaChange={handleAreaChange}
              />
            </div>
            {mapActions}
            {area.m2 > 0 && (
              <AreaDisplay
                m2={area.m2}
                sotix={area.sotix}
                hectare={area.hectare}
              />
            )}
          </div>

          {/* Sidebar form */}
          <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4 overflow-y-auto">
            <h3 className="font-bold text-foreground">Ekin ma'lumotlari</h3>
            {formSection}
          </div>
        </div>
      </div>
    );
  }

  // ── Mobile layout ──
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-5 pb-3">
        <h2 className="text-xl font-bold text-foreground">Dala Xaritasi</h2>
        <p className="text-sm text-muted-foreground">
          Maydoningizni xaritada belgilang
        </p>
      </div>

      {/* Map */}
      <div
        className="relative mx-4 rounded-2xl overflow-hidden shadow-lg border border-border"
        style={{ height: "calc(100vh - 430px)", minHeight: 220 }}
      >
        <MapboxFieldMap
          ref={mapboxRef}
          onPolygonChange={handlePolygonChange}
          onAreaChange={handleAreaChange}
        />
      </div>

      {/* Map actions */}
      <div className="flex-shrink-0 px-4 mt-3">{mapActions}</div>

      {/* Area display */}
      {area.m2 > 0 && (
        <div className="flex-shrink-0 mx-4 mt-3">
          <AreaDisplay m2={area.m2} sotix={area.sotix} hectare={area.hectare} />
        </div>
      )}

      {/* Form */}
      <div className="flex-shrink-0 px-4 mt-4 pb-4 flex flex-col gap-3 overflow-y-auto">
        {formSection}
      </div>
    </div>
  );
}
