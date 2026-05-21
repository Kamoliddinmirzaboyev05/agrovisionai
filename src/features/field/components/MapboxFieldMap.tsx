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
  Layers,
  Pencil,
  Undo2,
  CheckCircle2,
  AlertCircle,
  Navigation,
} from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import type { SavedField } from "@/types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN;

export interface AreaResult {
  m2: number;
  sotix: number;
  hectare: number;
}

interface MapboxFieldMapProps {
  savedFields: SavedField[];
  activeFieldId: number | null;
  onPolygonChange: (geojson: GeoJSON.Feature<GeoJSON.Polygon> | null) => void;
  onAreaChange: (area: AreaResult) => void;
  onFieldClick?: (fieldId: number) => void;
}

export interface MapboxFieldMapHandle {
  startDrawing: () => void;
  setPolygonForEditing: (geojson: GeoJSON.Feature<GeoJSON.Polygon>) => void;
  clearActive: () => void;
  fitToFields: () => void;
}

type DrawMode = "idle" | "drawing" | "editing";

export const MapboxFieldMap = forwardRef<
  MapboxFieldMapHandle,
  MapboxFieldMapProps
>(
  (
    { savedFields, activeFieldId, onPolygonChange, onAreaChange, onFieldClick },
    ref,
  ) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const draw = useRef<MapboxDraw | null>(null);
    const fieldMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const historyRef = useRef<GeoJSON.Position[][]>([]);

    const [mapStyle, setMapStyle] = useState<"satellite" | "streets">(
      "satellite",
    );
    const [locationStatus, setLocationStatus] = useState<{
      type: "success" | "error" | "loading" | null;
      message: string;
    }>({ type: null, message: "" });
    const [drawMode, setDrawMode] = useState<DrawMode>("idle");
    const [hasActive, setHasActive] = useState(false);
    const [vertexCount, setVertexCount] = useState(0);
    const [mapReady, setMapReady] = useState(false);

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

    useImperativeHandle(ref, () => ({
      startDrawing: () => {
        if (!draw.current) return;
        const data = draw.current.getAll();
        if (data.features.length > 0) {
          setDrawMode("editing");
          draw.current.changeMode("direct_select", {
            featureId: data.features[0].id as string,
          });
        } else {
          historyRef.current = [];
          setVertexCount(0);
          setDrawMode("drawing");
          draw.current.changeMode("draw_polygon");
        }
      },
      setPolygonForEditing: (geojson: GeoJSON.Feature<GeoJSON.Polygon>) => {
        if (!draw.current) return;
        draw.current.deleteAll();
        const ids = draw.current.add(geojson);
        setDrawMode("editing");
        setHasActive(true);
        computeArea(geojson);
        setTimeout(() => {
          draw.current?.changeMode("direct_select", {
            featureId: ids[0],
          });
        }, 100);
      },
      clearActive: () => {
        if (!draw.current) return;
        draw.current.deleteAll();
        draw.current.changeMode("simple_select");
        historyRef.current = [];
        setDrawMode("idle");
        setHasActive(false);
        setVertexCount(0);
        onPolygonChange(null);
        onAreaChange({ m2: 0, sotix: 0, hectare: 0 });
      },
      fitToFields: () => {
        if (!map.current || savedFields.length === 0) return;
        const bounds = new mapboxgl.LngLatBounds();
        savedFields.forEach((f) => {
          f.coordinates.forEach(({ lat, lng }) =>
            bounds.extend([lng, lat]),
          );
        });
        map.current.fitBounds(bounds, { padding: 60, duration: 1200 });
      },
    }));

    // ── Initialize map ──
    useEffect(() => {
      if (!mapContainer.current || map.current) return;
      if (!MAPBOX_TOKEN) return;

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

      // ── GeolocateControl — most reliable cross-platform location ──
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        },
        trackUserLocation: true,
        showUserHeading: true,
        showAccuracyCircle: true,
        fitBoundsOptions: { 
          zoom: 18, 
          duration: 2500,
          maxZoom: 20 
        },
      });

      mapInstance.addControl(geolocate, "top-right");

      geolocate.on("geolocate", (pos: any) => {
        const { accuracy } = pos.coords;
        console.log("Accuracy:", accuracy);
        
        setLocationStatus({
          type: "success",
          message: accuracy < 20 
            ? "Joylashuvingiz aniqlandi (Yuqori aniqlik)" 
            : "Joylashuvingiz aniqlandi",
        });
        setTimeout(() => setLocationStatus({ type: null, message: "" }), 4000);
      });

      geolocate.on("error", (e: { code: number; message: string }) => {
        console.error("Geolocate error:", e);
        const msgs: Record<number, string> = {
          1: "Joylashuvga ruxsat berilmadi. Brauzer sozlamalarini tekshiring.",
          2: "Joylashuvni aniqlab bo'mladi. Internet yoki GPS ni tekshiring.",
          3: "Joylashuvni aniqlash vaqti tugadi. Qayta urinib ko'ring.",
        };
        setLocationStatus({
          type: "error",
          message: msgs[e.code] ?? "Joylashuvni aniqlab bo'mladi",
        });
        setTimeout(() => setLocationStatus({ type: null, message: "" }), 5000);
      });

      // Save geolocate control to ref if we want to trigger it from custom button
      (mapInstance as any)._geolocateControl = geolocate;

      const drawInstance = new MapboxDraw({
        displayControlsDefault: false,
        controls: {},
        defaultMode: "simple_select",
        clickBuffer: 10,
        touchBuffer: 30,
        styles: [
          {
            id: "gl-draw-polygon-fill-active",
            type: "fill",
            filter: [
              "all",
              ["==", "$type", "Polygon"],
              ["!=", "mode", "static"],
            ],
            paint: { "fill-color": "#16a34a", "fill-opacity": 0.25 },
          },
          {
            id: "gl-draw-polygon-fill-static",
            type: "fill",
            filter: [
              "all",
              ["==", "$type", "Polygon"],
              ["==", "mode", "static"],
            ],
            paint: { "fill-color": "#16a34a", "fill-opacity": 0.2 },
          },
          {
            id: "gl-draw-polygon-stroke-active",
            type: "line",
            filter: [
              "all",
              ["==", "$type", "Polygon"],
              ["!=", "mode", "static"],
            ],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#16a34a", "line-width": 3 },
          },
          {
            id: "gl-draw-polygon-stroke-glow",
            type: "line",
            filter: [
              "all",
              ["==", "$type", "Polygon"],
              ["!=", "mode", "static"],
            ],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#22c55e",
              "line-width": 8,
              "line-opacity": 0.2,
              "line-blur": 3,
            },
          },
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
          {
            id: "gl-draw-polygon-midpoint",
            type: "circle",
            filter: [
              "all",
              ["==", "$type", "Point"],
              ["==", "meta", "midpoint"],
            ],
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

      mapInstance.on("draw.render", () => {
        if (drawInstance.getMode() === "draw_polygon") {
          const data = drawInstance.getAll();
          const lines = data.features.filter(
            (f: GeoJSON.Feature) => f.geometry.type === "LineString",
          );
          if (lines.length > 0) {
            const coords = (lines[0].geometry as GeoJSON.LineString)
              .coordinates;
            setVertexCount(coords.length);
          }
        }
      });

      mapInstance.on("draw.create", () => {
        const data = drawInstance.getAll();
        if (!data || data.features.length === 0) return;
        if (data.features.length > 1) {
          const last = data.features[data.features.length - 1];
          drawInstance.deleteAll();
          drawInstance.add(last);
        }
        const feature = drawInstance.getAll()
          .features[0] as GeoJSON.Feature<GeoJSON.Polygon>;
        historyRef.current = [feature.geometry.coordinates[0]];
        computeArea(feature);
        setHasActive(true);
        setDrawMode("idle");
        setVertexCount(0);
        setTimeout(() => drawInstance.changeMode("simple_select"), 50);
      });

      mapInstance.on("draw.update", () => {
        const data = drawInstance.getAll();
        if (!data || data.features.length === 0) return;
        const feature = data.features[0] as GeoJSON.Feature<GeoJSON.Polygon>;
        historyRef.current.push(feature.geometry.coordinates[0]);
        computeArea(feature);
        setHasActive(true);
      });

      mapInstance.on("draw.delete", () => {
        historyRef.current = [];
        setHasActive(false);
        setDrawMode("idle");
        setVertexCount(0);
        onPolygonChange(null);
        onAreaChange({ m2: 0, sotix: 0, hectare: 0 });
      });

      mapInstance.on("draw.modechange", (e: { mode: string }) => {
        if (e.mode === "draw_polygon") setDrawMode("drawing");
        else if (e.mode === "direct_select") setDrawMode("editing");
        else
          setDrawMode((prev) =>
            prev === "drawing" || prev === "editing" ? "idle" : prev,
          );
      });

      mapInstance.on("mousemove", (e) => {
        const layers = [
          "gl-draw-polygon-fill-active",
          "gl-draw-polygon-fill-static",
          "saved-fields-fill",
        ].filter(id => mapInstance.getLayer(id));

        if (layers.length === 0) return;

        const features = mapInstance.queryRenderedFeatures(e.point, {
          layers
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

    // ── Render saved fields as GeoJSON layers ──
    useEffect(() => {
      const mapInstance = map.current;
      if (!mapInstance || !mapReady) return;

      // Remove old markers
      fieldMarkersRef.current.forEach((m) => m.remove());
      fieldMarkersRef.current = [];

      // Remove old layers/source
      [
        "saved-fields-fill",
        "saved-fields-stroke",
        "saved-fields-stroke-active",
      ].forEach((id) => {
        if (mapInstance.getLayer(id)) mapInstance.removeLayer(id);
      });
      if (mapInstance.getSource("saved-fields"))
        mapInstance.removeSource("saved-fields");

      if (savedFields.length === 0) return;

      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: savedFields.map((f) => ({
          type: "Feature",
          id: f.id,
          geometry: {
            type: "Polygon",
            coordinates: [f.coordinates.map((c) => [c.lng, c.lat])],
          },
          properties: {
            id: f.id,
            name: f.name,
            crop: f.crop,
            active: f.id === activeFieldId,
          },
        })),
      };

      mapInstance.addSource("saved-fields", { type: "geojson", data: geojson });

      // Fill layer
      mapInstance.addLayer({
        id: "saved-fields-fill",
        type: "fill",
        source: "saved-fields",
        paint: {
          "fill-color": [
            "case",
            ["==", ["get", "active"], true],
            "#16a34a",
            "#22c55e",
          ],
          "fill-opacity": ["case", ["==", ["get", "active"], true], 0.35, 0.2],
        },
      });

      // Stroke
      mapInstance.addLayer({
        id: "saved-fields-stroke",
        type: "line",
        source: "saved-fields",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "active"], true],
            "#15803d",
            "#16a34a",
          ],
          "line-width": ["case", ["==", ["get", "active"], true], 3, 2],
        },
      });

      // Click on saved field
      mapInstance.on("click", "saved-fields-fill", (e) => {
        const id = e.features?.[0]?.properties?.id as number | undefined;
        if (id !== undefined && onFieldClick) onFieldClick(id);
      });

      // Label markers at centroid
      savedFields.forEach((f) => {
        const lng = f.center_lng;
        const lat = f.center_lat;
        const isActive = f.id === activeFieldId;

        const el = document.createElement("div");
        el.style.cssText = `
          background: ${isActive ? "#15803d" : "#16a34a"};
          color: white;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 20px;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          border: 2px solid ${isActive ? "#fff" : "rgba(255,255,255,0.6)"};
          cursor: pointer;
          pointer-events: auto;
        `;
        el.textContent = f.name;
        el.addEventListener("click", () => onFieldClick?.(f.id));

        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([lng, lat])
          .addTo(mapInstance);
        fieldMarkersRef.current.push(marker);
      });
    }, [savedFields, activeFieldId, mapReady, onFieldClick]);

    // ── Map style switch ──
    useEffect(() => {
      if (!map.current || !mapReady) return;
      map.current.setStyle(
        mapStyle === "satellite"
          ? "mapbox://styles/mapbox/satellite-streets-v12"
          : "mapbox://styles/mapbox/streets-v12",
      );
    }, [mapStyle, mapReady]);

    const handleGeolocate = useCallback(() => {
      if (!map.current) return;
      const ctrl = (map.current as any)._geolocateControl;
      if (ctrl) {
        setLocationStatus({
          type: "loading",
          message: "Joylashuv aniqlanmoqda...",
        });
        ctrl.trigger();
      }
    }, []);

    // ── Undo ──
    const handleUndo = useCallback(() => {
      if (!draw.current || historyRef.current.length < 2) return;
      historyRef.current.pop();
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

    // ── Finish drawing ──
    const handleFinishDrawing = useCallback(() => {
      if (!draw.current || draw.current.getMode() !== "draw_polygon") return;
      draw.current.changeMode("simple_select");
      const data = draw.current.getAll();
      if (data.features.length === 0) {
        setDrawMode("idle");
        setVertexCount(0);
      }
    }, []);

    // ── Cancel drawing ──
    const handleCancelDrawing = useCallback(() => {
      if (!draw.current) return;
      draw.current.changeMode("simple_select");
      setDrawMode("idle");
      setVertexCount(0);
    }, []);

    const isDrawingMode = drawMode === "drawing";
    const isEditingMode = drawMode === "editing";
    const canUndo = historyRef.current.length >= 2;

    return (
      <div className="relative w-full h-full select-none">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Custom Locate Button */}
        <div className="absolute top-20 right-3 z-10">
          <button
            onClick={handleGeolocate}
            className="bg-white text-green-700 p-3 rounded-xl shadow-lg border border-green-100 hover:bg-green-50 active:scale-95 transition-all flex items-center justify-center group"
            title="Mening joylashuvim"
          >
            <Navigation className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          </button>
        </div>

        {/* Drawing toolbar */}
        {isDrawingMode && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2.5 border border-green-200 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-green-700">
                {vertexCount < 3
                  ? `${vertexCount} nuqta — kamida 3 ta kerak`
                  : `${vertexCount} nuqta — birinchi nuqtaga bosib yoping`}
              </span>
            </div>
            <button
              onClick={handleCancelDrawing}
              className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2.5 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 active:scale-95 transition-all"
            >
              Bekor qilish
            </button>
          </div>
        )}

        {/* Finish drawing button */}
        {isDrawingMode && vertexCount >= 3 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={handleFinishDrawing}
              className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Chizishni tugatish
            </button>
          </div>
        )}

        {/* Editing toolbar */}
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
              >
                <Undo2 className="w-4 h-4" /> Orqaga
              </button>
            )}
            <button
              onClick={() => {
                draw.current?.changeMode("simple_select");
                setDrawMode("idle");
              }}
              className="bg-green-600 rounded-xl shadow-lg px-3 py-2.5 text-white flex items-center gap-1.5 text-sm font-semibold hover:bg-green-700 active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" /> Tayyor
            </button>
          </div>
        )}

        {/* Idle hint */}
        {!isDrawingMode && !isEditingMode && hasActive && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Pencil className="w-3 h-3" /> Tahrirlash uchun "Tahrirlash"
              tugmasini bosing
            </div>
          </div>
        )}

        {/* Location toast */}
        {locationStatus.type && (
          <div
            className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-10 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 whitespace-nowrap ${locationStatus.type === "success" ? "bg-green-600" : locationStatus.type === "error" ? "bg-red-500" : "bg-blue-500"}`}
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

        {/* No token */}
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
                ni <code className="bg-gray-100 px-1 rounded">.env</code>{" "}
                fayliga qo'shing
              </p>
            </div>
          </div>
        )}
      </div>
    );
  },
);

MapboxFieldMap.displayName = "MapboxFieldMap";
