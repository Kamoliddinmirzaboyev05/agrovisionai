import {
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { area } from "@turf/area";
import {
  Navigation,
  Layers,
  Pencil,
  Trash2,
  Undo2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

export interface AreaResult {
  m2: number;
  sotix: number;
  hectare: number;
}

interface MapboxFieldMapProps {
  onPolygonChange: (geojson: GeoJSON.Feature<GeoJSON.Polygon> | null) => void;
  onAreaChange: (area: AreaResult) => void;
}

export interface MapboxFieldMapHandle {
  startDrawing: () => void;
  clearPolygon: () => void;
  isDrawing: boolean;
  hasPolygon: boolean;
}

// Draw mode states
type DrawMode = "idle" | "drawing" | "editing";

export const MapboxFieldMap = forwardRef<
  MapboxFieldMapHandle,
  MapboxFieldMapProps
>(({ onPolygonChange, onAreaChange }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const userLocationMarker = useRef<mapboxgl.Marker | null>(null);

  const [mapStyle, setMapStyle] = useState<"satellite" | "streets">(
    "satellite",
  );
  const [locationStatus, setLocationStatus] = useState<{
    type: "success" | "error" | "loading" | null;
    message: string;
  }>({ type: null, message: "" });
  const [drawMode, setDrawMode] = useState<DrawMode>("idle");
  const [hasPolygon, setHasPolygon] = useState(false);
  const [vertexCount, setVertexCount] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  // Snapshot history for undo (stores GeoJSON coordinates)
  const historyRef = useRef<GeoJSON.Position[][]>([]);

  const clearLocationStatus = useCallback((delay = 3500) => {
    setTimeout(() => setLocationStatus({ type: null, message: "" }), delay);
  }, []);

  // Expose imperative handle to parent
  useImperativeHandle(ref, () => ({
    startDrawing: () => {
      if (!draw.current) return;
      const data = draw.current.getAll();
      if (data.features.length > 0) {
        // Polygon exists → enter edit mode
        setDrawMode("editing");
        draw.current.changeMode("direct_select", {
          featureId: data.features[0].id as string,
        });
      } else {
        // No polygon → start drawing
        historyRef.current = [];
        setVertexCount(0);
        setDrawMode("drawing");
        draw.current.changeMode("draw_polygon");
      }
    },
    clearPolygon: () => {
      if (!draw.current) return;
      draw.current.deleteAll();
      draw.current.changeMode("simple_select");
      historyRef.current = [];
      setDrawMode("idle");
      setHasPolygon(false);
      setVertexCount(0);
      onPolygonChange(null);
      onAreaChange({ m2: 0, sotix: 0, hectare: 0 });
    },
    get isDrawing() {
      return drawMode === "drawing" || drawMode === "editing";
    },
    get hasPolygon() {
      return hasPolygon;
    },
  }));

  const computeArea = useCallback(
    (feature: GeoJSON.Feature<GeoJSON.Polygon>) => {
      const areaM2 = area(feature);
      onAreaChange({
        m2: Math.round(areaM2),
        sotix: Math.round((areaM2 / 100) * 10) / 10,
        hectare: Math.round((areaM2 / 10000) * 100) / 100,
      });
      onPolygonChange(feature);
    },
    [onAreaChange, onPolygonChange],
  );

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!MAPBOX_TOKEN) {
      console.error("VITE_MAPBOX_TOKEN is not set. Add it to your .env file.");
      return;
    }

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [64.5853, 41.3775],
      zoom: 6,
      attributionControl: false,
    });

    mapInstance.addControl(
      new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      }),
      "top-right",
    );
    mapInstance.addControl(
      new mapboxgl.ScaleControl({ maxWidth: 100, unit: "metric" }),
      "bottom-right",
    );
    mapInstance.addControl(new mapboxgl.FullscreenControl(), "top-right");

    const drawInstance = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      defaultMode: "simple_select",
      clickBuffer: 10,
      touchBuffer: 30,
      styles: [
        // Active polygon fill
        {
          id: "gl-draw-polygon-fill-active",
          type: "fill",
          filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
          paint: { "fill-color": "#16a34a", "fill-opacity": 0.25 },
        },
        // Static polygon fill
        {
          id: "gl-draw-polygon-fill-static",
          type: "fill",
          filter: ["all", ["==", "$type", "Polygon"], ["==", "mode", "static"]],
          paint: { "fill-color": "#16a34a", "fill-opacity": 0.2 },
        },
        // Polygon stroke
        {
          id: "gl-draw-polygon-stroke-active",
          type: "line",
          filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#16a34a", "line-width": 3 },
        },
        // Polygon stroke glow
        {
          id: "gl-draw-polygon-stroke-glow",
          type: "line",
          filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#22c55e",
            "line-width": 8,
            "line-opacity": 0.2,
            "line-blur": 3,
          },
        },
        // Line while drawing
        {
          id: "gl-draw-line-active",
          type: "line",
          filter: [
            "all",
            ["==", "$type", "LineString"],
            ["!=", "mode", "static"],
          ],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#16a34a",
            "line-width": 2.5,
            "line-dasharray": [2, 2],
          },
        },
        // Vertex circles
        {
          id: "gl-draw-polygon-and-line-vertex-active",
          type: "circle",
          filter: [
            "all",
            ["==", "meta", "vertex"],
            ["==", "$type", "Point"],
            ["!=", "mode", "static"],
          ],
          paint: {
            "circle-radius": 7,
            "circle-color": "#16a34a",
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 2.5,
          },
        },
        // Vertex shadow
        {
          id: "gl-draw-polygon-vertex-shadow",
          type: "circle",
          filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"]],
          paint: {
            "circle-radius": 13,
            "circle-color": "#16a34a",
            "circle-opacity": 0.15,
          },
        },
        // Midpoints
        {
          id: "gl-draw-polygon-midpoint",
          type: "circle",
          filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
          paint: {
            "circle-radius": 4,
            "circle-color": "#22c55e",
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 2,
          },
        },
      ],
    });

    mapInstance.addControl(drawInstance);
    draw.current = drawInstance;

    // Track vertex count while drawing
    mapInstance.on("draw.render", () => {
      if (drawInstance.getMode() === "draw_polygon") {
        const data = drawInstance.getAll();
        // During drawing, the active feature is a LineString
        const lines = data.features.filter(
          (f) => f.geometry.type === "LineString",
        );
        if (lines.length > 0) {
          const coords = (lines[0].geometry as GeoJSON.LineString).coordinates;
          setVertexCount(coords.length);
        }
      }
    });

    mapInstance.on("draw.create", () => {
      const data = drawInstance.getAll();
      if (!data || data.features.length === 0) return;

      // Keep only the latest polygon
      if (data.features.length > 1) {
        const last = data.features[data.features.length - 1];
        drawInstance.deleteAll();
        drawInstance.add(last);
      }

      const feature = drawInstance.getAll()
        .features[0] as GeoJSON.Feature<GeoJSON.Polygon>;
      // Save initial snapshot
      historyRef.current = [feature.geometry.coordinates[0]];
      computeArea(feature);
      setHasPolygon(true);
      setDrawMode("idle");
      setVertexCount(0);
      setTimeout(() => drawInstance.changeMode("simple_select"), 50);
    });

    mapInstance.on("draw.update", () => {
      const data = drawInstance.getAll();
      if (!data || data.features.length === 0) return;
      const feature = data.features[0] as GeoJSON.Feature<GeoJSON.Polygon>;
      // Push snapshot for undo
      historyRef.current.push(feature.geometry.coordinates[0]);
      computeArea(feature);
      setHasPolygon(true);
    });

    mapInstance.on("draw.delete", () => {
      historyRef.current = [];
      setHasPolygon(false);
      setDrawMode("idle");
      setVertexCount(0);
      onPolygonChange(null);
      onAreaChange({ m2: 0, sotix: 0, hectare: 0 });
    });

    mapInstance.on("draw.modechange", (e: { mode: string }) => {
      if (e.mode === "draw_polygon") {
        setDrawMode("drawing");
      } else if (e.mode === "direct_select") {
        setDrawMode("editing");
      } else {
        setDrawMode((prev) =>
          prev === "drawing" ? "idle" : prev === "editing" ? "idle" : prev,
        );
      }
    });

    // Cursor feedback
    mapInstance.on("mousemove", (e) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: ["gl-draw-polygon-fill-active", "gl-draw-polygon-fill-static"],
      });
      mapInstance.getCanvas().style.cursor =
        features.length > 0 ? "pointer" : "";
    });

    mapInstance.on("load", () => setMapReady(true));

    map.current = mapInstance;

    return () => {
      mapInstance.remove();
      map.current = null;
      draw.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map style switch
  useEffect(() => {
    if (!map.current || !mapReady) return;
    const style =
      mapStyle === "satellite"
        ? "mapbox://styles/mapbox/satellite-streets-v12"
        : "mapbox://styles/mapbox/streets-v12";
    map.current.setStyle(style);
  }, [mapStyle, mapReady]);

  // Undo last vertex edit
  const handleUndo = useCallback(() => {
    if (!draw.current || historyRef.current.length < 2) return;
    historyRef.current.pop(); // remove current
    const prev = historyRef.current[historyRef.current.length - 1];
    const data = draw.current.getAll();
    if (data.features.length === 0) return;
    const featureId = data.features[0].id as string;
    draw.current.delete(featureId);
    const newFeature: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [prev] },
    };
    draw.current.add(newFeature);
    computeArea(newFeature);
  }, [computeArea]);

  // Finish drawing (close polygon)
  const handleFinishDrawing = useCallback(() => {
    if (!draw.current) return;
    // Simulate double-click to close polygon
    const mode = draw.current.getMode();
    if (mode === "draw_polygon") {
      // @ts-expect-error internal API
      draw.current.changeMode("simple_select");
      // If polygon was created it fires draw.create; if not enough points, just cancel
      const data = draw.current.getAll();
      if (data.features.length === 0) {
        setDrawMode("idle");
        setVertexCount(0);
      }
    }
  }, []);

  // Cancel drawing
  const handleCancelDrawing = useCallback(() => {
    if (!draw.current) return;
    draw.current.changeMode("simple_select");
    setDrawMode("idle");
    setVertexCount(0);
  }, []);

  // Geolocation
  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus({
        type: "error",
        message: "Joylashuv xizmati mavjud emas",
      });
      clearLocationStatus();
      return;
    }

    setLocationStatus({
      type: "loading",
      message: "Joylashuv aniqlanmoqda...",
    });

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { longitude, latitude } = coords;

        userLocationMarker.current?.remove();

        const el = document.createElement("div");
        el.style.cssText = `
            width: 18px; height: 18px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 5px rgba(59,130,246,0.25), 0 2px 8px rgba(0,0,0,0.3);
          `;

        userLocationMarker.current = new mapboxgl.Marker(el)
          .setLngLat([longitude, latitude])
          .addTo(map.current!);

        map.current?.flyTo({
          center: [longitude, latitude],
          zoom: 13,
          duration: 1800,
        });

        setLocationStatus({
          type: "success",
          message: "Joylashuvingiz aniqlandi",
        });
        clearLocationStatus();
      },
      (err) => {
        const messages: Record<number, string> = {
          1: "Joylashuvga ruxsat berilmadi",
          2: "Joylashuv ma'lumoti mavjud emas",
          3: "Joylashuvni aniqlash vaqti tugadi",
        };
        setLocationStatus({
          type: "error",
          message: messages[err.code] ?? "Joylashuvni aniqlab bo'lmadi",
        });
        clearLocationStatus(4000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [clearLocationStatus]);

  const isDrawingMode = drawMode === "drawing";
  const isEditingMode = drawMode === "editing";
  const canUndo = historyRef.current.length >= 2;

  return (
    <div className="relative w-full h-full select-none">
      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* ── Top-left: map style toggle ── */}
      <div className="absolute top-3 left-3 z-10 flex rounded-xl overflow-hidden shadow-lg border border-white/20">
        <button
          onClick={() => setMapStyle("satellite")}
          className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            mapStyle === "satellite"
              ? "bg-green-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Satellite
        </button>
        <button
          onClick={() => setMapStyle("streets")}
          className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            mapStyle === "streets"
              ? "bg-green-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Ko'cha
        </button>
      </div>

      {/* ── Top-right: locate button (below mapbox controls) ── */}
      <button
        onClick={handleLocate}
        disabled={locationStatus.type === "loading"}
        className={`absolute top-[108px] right-3 z-10 bg-white rounded-xl shadow-lg px-3 py-2.5 border border-gray-200 flex items-center gap-2 transition-all ${
          locationStatus.type === "loading"
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-green-50 active:scale-95"
        }`}
        title="Joylashuvimni topish"
      >
        <Navigation
          className={`w-4 h-4 text-green-700 ${locationStatus.type === "loading" ? "animate-pulse" : ""}`}
        />
        <span className="text-xs font-semibold text-green-700 hidden sm:inline">
          Joylashuvim
        </span>
      </button>

      {/* ── Drawing toolbar (shown while drawing) ── */}
      {isDrawingMode && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          {/* Vertex counter */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2.5 border border-green-200 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-green-700">
              {vertexCount < 3
                ? `${vertexCount} nuqta — kamida 3 ta kerak`
                : `${vertexCount} nuqta — tugatish uchun birinchi nuqtaga bosing`}
            </span>
          </div>
          {/* Cancel button */}
          <button
            onClick={handleCancelDrawing}
            className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2.5 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 active:scale-95 transition-all"
          >
            Bekor qilish
          </button>
        </div>
      )}

      {/* ── Editing toolbar (shown while editing) ── */}
      {isEditingMode && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2.5 border border-blue-200 flex items-center gap-2">
            <Pencil className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">
              Nuqtalarni sudrab tahrirlang
            </span>
          </div>
          {canUndo && (
            <button
              onClick={handleUndo}
              className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2.5 border border-gray-200 text-gray-700 flex items-center gap-1.5 text-sm font-semibold hover:bg-gray-50 active:scale-95 transition-all"
              title="Orqaga qaytarish"
            >
              <Undo2 className="w-4 h-4" />
              Orqaga
            </button>
          )}
          <button
            onClick={() => {
              draw.current?.changeMode("simple_select");
              setDrawMode("idle");
            }}
            className="bg-green-600 rounded-xl shadow-lg px-3 py-2.5 text-white flex items-center gap-1.5 text-sm font-semibold hover:bg-green-700 active:scale-95 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            Tayyor
          </button>
        </div>
      )}

      {/* ── Idle with polygon: click-to-edit hint ── */}
      {!isDrawingMode && !isEditingMode && hasPolygon && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Pencil className="w-3 h-3" />
            Tahrirlash uchun "Maydonni tahrirlash" tugmasini bosing
          </div>
        </div>
      )}

      {/* ── Finish drawing button (when ≥3 vertices) ── */}
      {isDrawingMode && vertexCount >= 3 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={handleFinishDrawing}
            className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Chizishni tugatish
          </button>
        </div>
      )}

      {/* ── Location status toast ── */}
      {locationStatus.type && (
        <div
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-10 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 whitespace-nowrap ${
            locationStatus.type === "success"
              ? "bg-green-600"
              : locationStatus.type === "error"
                ? "bg-red-500"
                : "bg-blue-500"
          }`}
        >
          {locationStatus.type === "success" && (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {locationStatus.type === "error" && (
            <AlertCircle className="w-4 h-4" />
          )}
          {locationStatus.type === "loading" && (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {locationStatus.message}
        </div>
      )}

      {/* ── No token warning ── */}
      {!MAPBOX_TOKEN && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-100">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm text-center border border-red-200">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-800 mb-1">
              Mapbox token topilmadi
            </h3>
            <p className="text-sm text-gray-500">
              <code className="bg-gray-100 px-1 rounded">
                VITE_MAPBOX_TOKEN
              </code>{" "}
              ni <code className="bg-gray-100 px-1 rounded">.env</code> fayliga
              qo'shing
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

MapboxFieldMap.displayName = "MapboxFieldMap";
