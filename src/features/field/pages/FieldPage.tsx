import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Map, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { LeafletMap } from '../components/LeafletMap';
import { MapboxFieldMap } from '../components/MapboxFieldMap';
import { AreaDisplay } from '../components/AreaDisplay';
import { calcArea } from '../utils/calcArea';
import { useIsMobile } from '@/hooks/useIsMobile';
import { CROPS } from '@/constants';
import { ROUTES } from '@/router/routes';
import type { LatLng, FieldData } from '@/types';

export function FieldPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [useMapbox, setUseMapbox] = useState(true); // Default to Mapbox
  const [points, setPoints] = useState<LatLng[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [crop, setCrop] = useState('Pomidor');
  const [lastIrrigation, setLastIrrigation] = useState('');
  const [waterCycle, setWaterCycle] = useState('7');
  const [mapboxPolygon, setMapboxPolygon] = useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(null);
  const [mapboxArea, setMapboxArea] = useState({ m2: 0, sotix: 0, hectare: 0 });
  const mapboxRef = useRef<{ startDrawing: () => void; clearPolygon: () => void }>(null);

  const area = useMapbox ? mapboxArea : calcArea(points);

  const handleAddPoint = useCallback((p: LatLng) => setPoints((prev) => [...prev, p]), []);
  const handleLocate = useCallback((p: LatLng) => setPoints((prev) => [...prev, p]), []);
  
  const clear = () => {
    if (useMapbox) {
      setMapboxPolygon(null);
      setMapboxArea({ m2: 0, sotix: 0, hectare: 0 });
      // Trigger clear on Mapbox component
      const clearBtn = document.querySelector('[data-mapbox-clear]') as HTMLButtonElement;
      clearBtn?.click();
    } else {
      setPoints([]);
      setDrawing(false);
    }
  };

  const startDrawing = () => {
    if (useMapbox) {
      const drawBtn = document.querySelector('[data-mapbox-draw]') as HTMLButtonElement;
      drawBtn?.click();
    } else {
      setDrawing(true);
    }
  };

  const getDrawButtonText = () => {
    if (useMapbox) {
      return mapboxPolygon ? 'Maydonni tahrirlash' : 'Maydonni chizish';
    } else {
      return drawing ? "Chizishni to'xtatish" : 'Maydonni chizish';
    }
  };

  const handleNext = () => {
    if (useMapbox && !mapboxPolygon) {
      alert("Avval dala maydonini belgilang.");
      return;
    }
    if (!useMapbox && points.length < 3) {
      alert("Avval dala maydonini belgilang.");
      return;
    }
    if (area.m2 < 100) {
      alert("Maydon juda kichik, iltimos aniqroq belgilang.");
      return;
    }

    const fieldData: FieldData = useMapbox
      ? {
          points: mapboxPolygon!.geometry.coordinates[0].map(([lng, lat]) => ({ lat, lng })),
          crop,
          lastIrrigation,
          waterCycle,
        }
      : { points, crop, lastIrrigation, waterCycle };

    // Save GeoJSON output
    if (useMapbox && mapboxPolygon) {
      const output = {
        ...mapboxPolygon,
        properties: {
          area_m2: mapboxArea.m2,
          area_sotix: mapboxArea.sotix,
          area_hectare: mapboxArea.hectare,
          crop,
        },
      };
      console.log('Mapbox Field Data:', JSON.stringify(output, null, 2));
    }

    sessionStorage.setItem('fieldData', JSON.stringify(fieldData));
    navigate(ROUTES.UPLOAD);
  };

  const mapHeight = isMobile ? 'calc(100vh - 420px)' : 'calc(100vh - 280px)';

  const formSection = (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-semibold text-foreground mb-1.5 block">Ekin turi</label>
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
          <label className="text-sm font-semibold text-foreground mb-1.5 block">So'nggi sug'orish</label>
          <input
            type="date"
            value={lastIrrigation}
            onChange={(e) => setLastIrrigation(e.target.value)}
            className="w-full bg-input-background border border-border rounded-xl px-3 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Davr (kun)</label>
          <input
            type="number"
            value={waterCycle}
            onChange={(e) => setWaterCycle(e.target.value)}
            className="w-full bg-input-background border border-border rounded-xl px-3 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            min={1}
            max={30}
          />
        </div>
      </div>
      <button
        onClick={handleNext}
        className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-base mt-2"
      >
        Keyingi bosqich
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );

  if (!isMobile) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-between px-8 pt-6 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Dala Xaritasi</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Maydoningizni xaritada belgilang va ekin ma'lumotlarini kiriting
            </p>
          </div>
          {/* Map type toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setUseMapbox(false)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                !useMapbox ? 'bg-white text-green-700 shadow' : 'text-gray-600'
              }`}
            >
              Leaflet
            </button>
            <button
              onClick={() => setUseMapbox(true)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                useMapbox ? 'bg-white text-green-700 shadow' : 'text-gray-600'
              }`}
            >
              Mapbox
            </button>
          </div>
        </div>
        <div className="flex-1 flex gap-6 px-8 pb-8 overflow-hidden">
          {/* Map — takes most space */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div
              className="relative flex-1 rounded-2xl overflow-hidden shadow-lg border border-border"
            >
              {useMapbox ? (
                <>
                  <MapboxFieldMap onPolygonChange={setMapboxPolygon} onAreaChange={setMapboxArea} />
                  <button data-mapbox-draw className="hidden" onClick={() => {}} />
                  <button data-mapbox-clear className="hidden" onClick={() => {}} />
                </>
              ) : (
                <>
                  <LeafletMap drawing={drawing} points={points} onAddPoint={handleAddPoint} onLocate={handleLocate} />
                  {drawing && (
                    <div className="absolute top-3 left-3 z-[1000] bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg pointer-events-none flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      Xaritaga bosing • {points.length} nuqta
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => (useMapbox ? startDrawing() : setDrawing((d) => !d))}
                className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md ${
                  (useMapbox && mapboxPolygon) || (!useMapbox && drawing)
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                <Map className="w-5 h-5" />
                {getDrawButtonText()}
              </button>
              <button 
                onClick={clear} 
                className="p-3.5 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors shadow-md"
                title="Tozalash"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            {area.m2 > 0 && <AreaDisplay m2={area.m2} sotix={area.sotix} hectare={area.hectare} />}
          </div>
          {/* Form — fixed width sidebar */}
          <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4 overflow-y-auto">
            <h3 className="font-bold text-foreground">Ekin ma'lumotlari</h3>
            {formSection}
          </div>
        </div>
      </div>
    );
  }

  // Mobile
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Dala Xaritasi</h2>
          <p className="text-sm text-muted-foreground">Maydoningizni xaritada belgilang</p>
        </div>
        {/* Map type toggle - compact for mobile */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setUseMapbox(false)}
            className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
              !useMapbox ? 'bg-white text-green-700 shadow' : 'text-gray-600'
            }`}
          >
            Leaflet
          </button>
          <button
            onClick={() => setUseMapbox(true)}
            className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
              useMapbox ? 'bg-white text-green-700 shadow' : 'text-gray-600'
            }`}
          >
            Mapbox
          </button>
        </div>
      </div>
      <div
        className="relative flex-1 mx-4 rounded-2xl overflow-hidden shadow-lg border border-border"
      >
        {useMapbox ? (
          <>
            <MapboxFieldMap onPolygonChange={setMapboxPolygon} onAreaChange={setMapboxArea} />
            <button data-mapbox-draw className="hidden" onClick={() => {}} />
            <button data-mapbox-clear className="hidden" onClick={() => {}} />
          </>
        ) : (
          <>
            <LeafletMap drawing={drawing} points={points} onAddPoint={handleAddPoint} onLocate={handleLocate} />
            {drawing && (
              <div className="absolute top-3 left-3 z-[1000] bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg pointer-events-none flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                Xaritaga bosing • {points.length} nuqta
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex-shrink-0 px-4 mt-3 flex gap-2">
        <button
          onClick={() => (useMapbox ? startDrawing() : setDrawing((d) => !d))}
          className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md ${
            (useMapbox && mapboxPolygon) || (!useMapbox && drawing)
              ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          <Map className="w-5 h-5" />
          {getDrawButtonText()}
        </button>
        <button 
          onClick={clear} 
          className="p-3.5 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors shadow-md"
          title="Tozalash"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      {area.m2 > 0 && (
        <div className="flex-shrink-0 mx-4 mt-3">
          <AreaDisplay m2={area.m2} sotix={area.sotix} hectare={area.hectare} />
        </div>
      )}
      <div className="flex-shrink-0 px-4 mt-4 pb-4 flex flex-col gap-3 overflow-y-auto">{formSection}</div>
    </div>
  );
}
