import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';
import type { LatLng } from '@/types';
import { MAP_TILE_URL, MAP_LABELS_URL } from '@/constants';

export interface LeafletMapProps {
  drawing: boolean;
  points: LatLng[];
  onAddPoint: (p: LatLng) => void;
  onLocate: (p: LatLng) => void;
}

export function LeafletMap({ drawing, points, onAddPoint, onLocate }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userLocationMarker = useRef<L.Marker | null>(null);
  const drawingRef = useRef(drawing);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    drawingRef.current = drawing;
  }, [drawing]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { center: [41.2995, 69.2401], zoom: 13, zoomControl: true });

    const tileUrl = MAP_TILE_URL || 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const labelsUrl = MAP_LABELS_URL || 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

    L.tileLayer(tileUrl, { attribution: 'Tiles © Esri' }).addTo(map);
    L.tileLayer(labelsUrl, { attribution: '' }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (drawingRef.current) onAddPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (polygonRef.current) {
      polygonRef.current.remove();
      polygonRef.current = null;
    }

    points.forEach((p) => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;background:#16a34a;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(22,163,74,0.5)"></div>`,
        iconAnchor: [8, 8],
      });
      markersRef.current.push(L.marker([p.lat, p.lng], { icon }).addTo(map));
    });

    if (points.length >= 3) {
      polygonRef.current = L.polygon(
        points.map((p) => [p.lat, p.lng] as [number, number]),
        { color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.3, weight: 4 }
      ).addTo(map);
    }
  }, [points]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.style.cursor = drawing ? 'crosshair' : '';
  }, [drawing]);

  const handleLocate = () => {
    const map = mapRef.current;
    if (!map) return;

    if (!navigator.geolocation) {
      setLocationError('Joylashuv xizmati mavjud emas.');
      setTimeout(() => setLocationError(null), 3000);
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Remove old marker if exists
        if (userLocationMarker.current) {
          userLocationMarker.current.remove();
        }

        // Create custom icon for user location
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:20px;height:20px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3), 0 2px 8px rgba(0,0,0,0.3)"></div>`,
          iconAnchor: [10, 10],
        });

        // Add marker
        userLocationMarker.current = L.marker([latitude, longitude], { icon }).addTo(map);

        // Fly to location with zoom 18 (field level view)
        map.flyTo([latitude, longitude], 18, {
          duration: 2.5,
          essential: true,
        });

        onLocate({ lat: latitude, lng: longitude });
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
      <div ref={containerRef} className="w-full h-full" />
      <button
        onClick={handleLocate}
        disabled={isLocating}
        className={`absolute top-3 right-3 z-[1000] bg-white rounded-xl shadow-lg px-3 py-2.5 transition-all border border-green-100 flex items-center gap-2 ${
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
      
      {/* Location message */}
      {locationError && (
        <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg max-w-xs text-center ${
          locationError === 'Siz turgan mintaqa ochildi' ? 'bg-green-600' : 'bg-red-500'
        }`}>
          {locationError}
        </div>
      )}
      
      {/* Locating indicator */}
      {isLocating && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Joylashuv aniqlanmoqda...
        </div>
      )}
    </div>
  );
}
