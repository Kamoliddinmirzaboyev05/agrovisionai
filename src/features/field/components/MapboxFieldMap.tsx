import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { area } from '@turf/area';
import { Navigation, Layers } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

interface MapboxFieldMapProps {
  onPolygonChange: (geojson: GeoJSON.Feature<GeoJSON.Polygon> | null) => void;
  onAreaChange: (area: { m2: number; sotix: number; hectare: number }) => void;
}

export interface MapboxFieldMapHandle {
  startDrawing: () => void;
  clearPolygon: () => void;
}

export const MapboxFieldMap = forwardRef<MapboxFieldMapHandle, MapboxFieldMapProps>(
  ({ onPolygonChange, onAreaChange }, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const draw = useRef<MapboxDraw | null>(null);
    const userLocationMarker = useRef<mapboxgl.Marker | null>(null);
    const [mapStyle, setMapStyle] = useState<'satellite' | 'streets'>('satellite');
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasPolygon, setHasPolygon] = useState(false);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      startDrawing: () => {
        const data = draw.current?.getAll();
        if (data && data.features.length > 0) {
          // If polygon exists, enter edit mode
          setIsDrawing(true);
          draw.current?.changeMode('direct_select', {
            featureId: data.features[0].id
          });
        } else {
          // If no polygon, start drawing
          setIsDrawing(true);
          draw.current?.changeMode('draw_polygon');
        }
      },
      clearPolygon: () => {
        draw.current?.deleteAll();
        draw.current?.changeMode('simple_select');
        setIsDrawing(false);
        setHasPolygon(false);
        onPolygonChange(null);
        onAreaChange({ m2: 0, sotix: 0, hectare: 0 });
      },
    }));

    useEffect(() => {
      if (!mapContainer.current || map.current) return;

      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [64.5853, 41.3775], // Uzbekistan center
        zoom: 6,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
      });

      // Add navigation controls (zoom, rotation, pitch)
      map.current.addControl(
        new mapboxgl.NavigationControl({
          showCompass: true,
          showZoom: true,
          visualizePitch: true,
        }), 
        'top-right'
      );

      // Add scale control
      map.current.addControl(
        new mapboxgl.ScaleControl({
          maxWidth: 100,
          unit: 'metric'
        }),
        'bottom-right'
      );

      // Add fullscreen control
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      // Initialize Mapbox Draw
      draw.current = new MapboxDraw({
        displayControlsDefault: false,
        controls: {},
        defaultMode: 'simple_select',
        // Allow editing by clicking on polygon
        clickBuffer: 8,
        touchBuffer: 25,
        styles: [
          // Polygon fill
          {
            id: 'gl-draw-polygon-fill',
            type: 'fill',
            filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
            paint: {
              'fill-color': '#16a34a',
              'fill-opacity': 0.3,
            },
          },
          // Polygon outline
          {
            id: 'gl-draw-polygon-stroke-active',
            type: 'line',
            filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
            paint: {
              'line-color': '#16a34a',
              'line-width': 4,
            },
          },
          // Polygon outline glow effect
          {
            id: 'gl-draw-polygon-stroke-glow',
            type: 'line',
            filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
            paint: {
              'line-color': '#16a34a',
              'line-width': 8,
              'line-opacity': 0.3,
              'line-blur': 4,
            },
          },
          // Vertex points
          {
            id: 'gl-draw-polygon-and-line-vertex-active',
            type: 'circle',
            filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
            paint: {
              'circle-radius': 8,
              'circle-color': '#16a34a',
              'circle-stroke-color': '#fff',
              'circle-stroke-width': 3,
            },
          },
          // Vertex point shadow
          {
            id: 'gl-draw-polygon-vertex-shadow',
            type: 'circle',
            filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
            paint: {
              'circle-radius': 12,
              'circle-color': '#16a34a',
              'circle-opacity': 0.2,
              'circle-blur': 0.5,
            },
          },
          // Midpoints
          {
            id: 'gl-draw-polygon-midpoint',
            type: 'circle',
            filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
            paint: {
              'circle-radius': 5,
              'circle-color': '#22c55e',
              'circle-stroke-color': '#fff',
              'circle-stroke-width': 2,
            },
          },
        ],
      });

      map.current.addControl(draw.current);

      // Handle draw events
      const handleDrawCreate = () => {
        const data = draw.current?.getAll();
        if (!data || data.features.length === 0) return;

        // Keep only the last polygon
        if (data.features.length > 1) {
          const lastFeature = data.features[data.features.length - 1];
          draw.current?.deleteAll();
          draw.current?.add(lastFeature);
        }

        const feature = data.features[0] as GeoJSON.Feature<GeoJSON.Polygon>;
        calculateArea(feature);
        setHasPolygon(true);
        setIsDrawing(false);
        // Automatically enter edit mode after drawing
        setTimeout(() => {
          draw.current?.changeMode('simple_select');
        }, 100);
      };

      const handleDrawUpdate = () => {
        const data = draw.current?.getAll();
        if (!data || data.features.length === 0) {
          onPolygonChange(null);
          onAreaChange({ m2: 0, sotix: 0, hectare: 0 });
          setHasPolygon(false);
          return;
        }
        const feature = data.features[0] as GeoJSON.Feature<GeoJSON.Polygon>;
        calculateArea(feature);
        setHasPolygon(true);
      };

      const handleDrawDelete = () => {
        onPolygonChange(null);
        onAreaChange({ m2: 0, sotix: 0, hectare: 0 });
        setHasPolygon(false);
        setIsDrawing(false);
      };

      map.current.on('draw.create', handleDrawCreate);
      map.current.on('draw.update', handleDrawUpdate);
      map.current.on('draw.delete', handleDrawDelete);

      // Click on map to select polygon for editing
      map.current.on('click', (e) => {
        const features = map.current?.queryRenderedFeatures(e.point, {
          layers: ['gl-draw-polygon-fill']
        });
        
        if (features && features.length > 0) {
          const data = draw.current?.getAll();
          if (data && data.features.length > 0) {
            // Enter edit mode when clicking on polygon
            setIsDrawing(true);
            draw.current?.changeMode('direct_select', {
              featureId: data.features[0].id
            });
          }
        }
      });

      // Change cursor when hovering over polygon
      map.current.on('mousemove', (e) => {
        const features = map.current?.queryRenderedFeatures(e.point, {
          layers: ['gl-draw-polygon-fill']
        });
        
        if (features && features.length > 0) {
          map.current!.getCanvas().style.cursor = 'pointer';
        } else {
          map.current!.getCanvas().style.cursor = '';
        }
      });

      return () => {
        map.current?.remove();
        map.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle map style change
    useEffect(() => {
      if (!map.current) return;
      const style =
        mapStyle === 'satellite'
          ? 'mapbox://styles/mapbox/satellite-streets-v12'
          : 'mapbox://styles/mapbox/streets-v12';
      map.current.setStyle(style);
    }, [mapStyle]);

    const calculateArea = (feature: GeoJSON.Feature<GeoJSON.Polygon>) => {
      const areaM2 = area(feature);
      const areaSotix = areaM2 / 100;
      const areaHectare = areaM2 / 10000;

      onAreaChange({
        m2: Math.round(areaM2),
        sotix: Math.round(areaSotix * 10) / 10,
        hectare: Math.round(areaHectare * 100) / 100,
      });
      onPolygonChange(feature);
    };

    const handleLocate = () => {
      if (!navigator.geolocation) {
        setLocationError('Joylashuv xizmati mavjud emas.');
        setTimeout(() => setLocationError(null), 3000);
        return;
      }

      setIsLocating(true);
      setLocationError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          
          // Remove old marker if exists
          if (userLocationMarker.current) {
            userLocationMarker.current.remove();
          }

          // Create custom marker element
          const el = document.createElement('div');
          el.className = 'user-location-marker';
          el.style.cssText = `
            width: 20px;
            height: 20px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0, 0, 0, 0.3);
            cursor: pointer;
          `;

          // Add marker to map
          userLocationMarker.current = new mapboxgl.Marker(el)
            .setLngLat([longitude, latitude])
            .addTo(map.current!);

          // Fly to location with zoom 9 (approximately 50 km visible area)
          map.current?.flyTo({
            center: [longitude, latitude],
            zoom: 9,
            essential: true,
            duration: 2000,
          });
          
          setIsLocating(false);
          setLocationError(null);
          
          // Show success message
          setLocationError('Siz turgan mintaqa ochildi');
          setTimeout(() => setLocationError(null), 3000);
        },
        (error) => {
          setIsLocating(false);
          if (error.code === error.PERMISSION_DENIED) {
            setLocationError('Joylashuvga ruxsat berilmadi');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setLocationError('Joylashuv ma\'lumoti mavjud emas.');
          } else if (error.code === error.TIMEOUT) {
            setLocationError('Joylashuvni aniqlash vaqti tugadi.');
          } else {
            setLocationError("Joylashuvni aniqlab bo'lmadi.");
          }
          setTimeout(() => setLocationError(null), 4000);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    return (
      <div className="relative w-full h-full">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Locate button */}
        <button
          onClick={handleLocate}
          disabled={isLocating}
          className={`absolute top-3 right-3 z-10 bg-white rounded-xl shadow-lg px-3 py-2.5 transition-all border border-green-100 flex items-center gap-2 ${
            isLocating 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-green-50 active:scale-95'
          }`}
          title="Joylashuvimni topish"
        >
          <Navigation className={`w-5 h-5 text-green-700 ${isLocating ? 'animate-pulse' : ''}`} />
          <span className="text-sm font-semibold text-green-700 hidden sm:inline">
            Joylashuvimni topish
          </span>
        </button>

        {/* Layer switch */}
        <div className="absolute top-3 left-3 z-10 bg-white rounded-xl shadow-lg border border-green-100 overflow-hidden flex">
          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              mapStyle === 'satellite' ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Satellite
          </button>
          <button
            onClick={() => setMapStyle('streets')}
            className={`px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              mapStyle === 'streets' ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Streets
          </button>
        </div>

        {/* Location message */}
        {locationError && (
          <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-10 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg max-w-xs text-center ${
            locationError === 'Siz turgan mintaqa ochildi' ? 'bg-green-600' : 'bg-red-500'
          }`}>
            {locationError}
          </div>
        )}
        
        {/* Locating indicator */}
        {isLocating && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Joylashuv aniqlanmoqda...
          </div>
        )}

        {/* Drawing hint */}
        {isDrawing && !hasPolygon && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 pointer-events-none">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Xaritaga bosib maydonni belgilang
          </div>
        )}

        {/* Edit hint */}
        {hasPolygon && !isDrawing && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 pointer-events-none">
            Maydonga bosib tahrirlang
          </div>
        )}
      </div>
    );
  }
);

MapboxFieldMap.displayName = 'MapboxFieldMap';
