import { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';

interface UploadZoneProps {
  isDesktop?: boolean;
  onImageChange?: (url: string | null) => void;
}

export function UploadZone({ isDesktop, onImageChange }: UploadZoneProps) {
  const [image, setImage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    const url = URL.createObjectURL(f);
    setImage(url);
    onImageChange?.(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImage(null);
    onImageChange?.(null);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => !image && inputRef.current?.click()}
      className="relative rounded-3xl border-2 border-dashed border-green-300 bg-green-50 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-green-500 hover:bg-green-100 transition-all"
      style={{ minHeight: isDesktop ? 320 : 240 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      {image ? (
        <>
          <img
            src={image}
            alt="Yuklangan rasm"
            className="w-full object-cover"
            style={{ minHeight: isDesktop ? 320 : 240, maxHeight: isDesktop ? 400 : 280 }}
          />
          <button
            onClick={handleClear}
            className="absolute top-3 right-3 bg-white/90 rounded-full p-1.5 shadow hover:bg-red-50"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
          <div className="absolute bottom-3 left-3 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            ✓ Rasm tanlandi
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 p-8">
          <div className="w-16 h-16 bg-green-200 rounded-2xl flex items-center justify-center">
            <Camera className="w-8 h-8 text-green-600" />
          </div>
          <p className="font-bold text-green-700 text-base">Rasm yuklash</p>
          <p className="text-xs text-muted-foreground text-center">JPG yoki PNG • Bosing yoki suring</p>
        </div>
      )}
    </div>
  );
}

export { UploadZone as default };
