import { useState, useEffect } from "react";
import { 
  Leaf, 
  Calendar, 
  Camera, 
  ChevronRight, 
  Plus, 
  Search,
  MapPin,
  Trash2,
  Activity,
  ArrowRight,
  Info
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useConfirm } from "@/store/ConfirmContext";
import { fieldService } from "../services/fieldService";
import { SavedField } from "@/types";
import { ROUTES } from "@/router/routes";
import { useIsMobile } from "@/hooks/useIsMobile";
import { UploadZone } from "@/features/analysis/components/UploadZone";

export function MyFieldsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const confirm = useConfirm();
  const [fields, setFields] = useState<SavedField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  
  // Form state for editing planting info
  const [editMode, setEditMode] = useState(false);
  const [plantedCrop, setPlantedCrop] = useState("");
  const [plantingDate, setPlantingDate] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      setIsLoading(true);
      const data = await fieldService.getFields();
      // Handle both wrapped results and direct array response
      const fieldsData = Array.isArray(data) ? data : (data?.results || []);
      setFields(fieldsData);
    } catch (err) {
      console.error("Failed to fetch fields:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: "Maydonni o'chirish",
      description: "Haqiqatan ham ushbu maydonni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.",
      confirmText: "O'chirish",
      variant: "destructive"
    });

    if (!isConfirmed) return;

    try {
      await fieldService.deleteField(id);
      setFields(prev => prev.filter(f => f.id !== id));
      if (selectedFieldId === id) setSelectedFieldId(null);
      toast.success("Maydon muvaffaqiyatli o'chirildi");
    } catch (err: any) {
      console.error("Delete failed:", err);
      toast.error(err.message || "Maydonni o'chirishda xatolik yuz berdi.");
    }
  };

  const handleSelectField = (field: SavedField) => {
    setSelectedFieldId(field.id);
    setPlantedCrop(field.crop);
    setPlantingDate(field.last_irrigation || new Date().toISOString().split('T')[0]);
    setEditMode(false);
    setImageUrl(null);
  };

  const handleSaveInfo = async () => {
    if (!selectedFieldId) return;
    try {
      await fieldService.updateField(selectedFieldId, {
        crop: plantedCrop,
        last_irrigation: plantingDate
      });
      setFields(prev => prev.map(f => f.id === selectedFieldId ? { ...f, crop: plantedCrop, last_irrigation: plantingDate } : f));
      setEditMode(false);
      toast.success("Ma'lumotlar saqlandi");
    } catch (err: any) {
      console.error("Update failed:", err);
      toast.error("Ma'lumotlarni saqlashda xatolik yuz berdi");
    }
  };

  const filteredFields = fields.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.crop.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedField = fields.find(f => f.id === selectedFieldId);

  return (
    <div className="flex flex-col lg:flex-row h-full bg-gray-50/50">
      {/* Sidebar: Fields List */}
      <div className={`flex-shrink-0 bg-white border-r border-border flex flex-col transition-all duration-300 ${
        selectedFieldId && isMobile ? 'hidden' : 'w-full lg:w-80'
      }`}>
        <div className="p-5 border-b border-border flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Maydonlarim</h2>
            <button 
              onClick={() => navigate(ROUTES.FIELD)}
              className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center hover:bg-green-200 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Qidirish..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-50">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-medium">Yuklanmoqda...</p>
            </div>
          ) : filteredFields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Leaf className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-bold text-foreground mb-1">Maydonlar topilmadi</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hali hech qanday maydon qo'shmagansiz yoki qidiruv natija bermadi.
              </p>
            </div>
          ) : (
            filteredFields.map(field => (
              <button
                key={field.id}
                onClick={() => handleSelectField(field)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group ${
                  selectedFieldId === field.id 
                    ? 'bg-green-50 text-green-700 shadow-sm border border-green-100' 
                    : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground border border-transparent'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  selectedFieldId === field.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-white'
                }`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold truncate">{field.name}</p>
                  <p className="text-[10px] opacity-70 truncate">
                    {field.crop} • {field.area_ha.toFixed(2)} ga
                  </p>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${selectedFieldId === field.id ? 'translate-x-1' : 'opacity-0'}`} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content: Field Details & Analysis */}
      <div className={`flex-1 flex flex-col min-w-0 bg-white lg:bg-transparent ${
        !selectedFieldId && isMobile ? 'hidden' : 'block'
      }`}>
        {selectedField ? (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-5 bg-white border-b border-border flex items-center justify-between sticky top-0 z-10 shadow-sm lg:shadow-none">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <button onClick={() => setSelectedFieldId(null)} className="p-2 -ml-2 text-muted-foreground">
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </button>
                )}
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedField.name}</h3>
                  <p className="text-xs text-muted-foreground">ID: #{selectedField.id} • {selectedField.area_ha.toFixed(2)} ga</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleDelete(selectedField.id)}
                  className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                  title="O'chirish"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 lg:p-8">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Section 1: Planting Info */}
                <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-border bg-gray-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Leaf className="w-5 h-5 text-green-600" />
                      <h4 className="font-bold text-foreground text-sm">Ekin ma'lumotlari</h4>
                    </div>
                    <button 
                      onClick={() => editMode ? handleSaveInfo() : setEditMode(true)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        editMode ? 'bg-green-600 text-white shadow-md' : 'text-primary hover:bg-green-50'
                      }`}
                    >
                      {editMode ? "Saqlash" : "Tahrirlash"}
                    </button>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nima ekilgan?</label>
                      {editMode ? (
                        <input 
                          type="text" 
                          value={plantedCrop}
                          onChange={(e) => setPlantedCrop(e.target.value)}
                          className="w-full bg-gray-50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                        />
                      ) : (
                        <p className="text-base font-bold text-foreground">{selectedField.crop || "Belgilanmagan"}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Qachon ekilgan?</label>
                      {editMode ? (
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input 
                            type="date" 
                            value={plantingDate}
                            onChange={(e) => setPlantingDate(e.target.value)}
                            className="w-full bg-gray-50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-green-600" />
                          <p className="text-base font-bold text-foreground">{selectedField.last_irrigation || "Belgilanmagan"}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 2: Image Upload & AI Analysis */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <Camera className="w-5 h-5 text-green-600" />
                      <h4 className="font-bold text-foreground text-sm">Rasm yuklash va Tahlil</h4>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <UploadZone 
                        isDesktop={!isMobile} 
                        onImageChange={(url) => setImageUrl(url)}
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-amber-600" />
                          <p className="text-xs font-bold text-amber-700">Tavsiya</p>
                        </div>
                        <p className="text-[10px] text-amber-800 leading-relaxed">
                          Ekin bargini yoki zararlangan qismini yaqindan, tiniq qilib suratga oling. 
                          Bu AI tahlilining aniqligini oshiradi.
                        </p>
                      </div>

                      <button 
                        disabled={!imageUrl}
                        onClick={() => {
                          if (selectedField) {
                            const fieldData = {
                              points: selectedField.coordinates,
                              crop: selectedField.crop,
                              name: selectedField.name,
                              area_ha: selectedField.area_ha,
                            };
                            sessionStorage.setItem("fieldData", JSON.stringify(fieldData));
                            navigate(ROUTES.LOADING);
                          }
                        }}
                        className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-200 hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                      >
                        <Activity className="w-5 h-5" />
                        AI Tahlil qilish
                      </button>

                      <div className="bg-white rounded-2xl border border-border p-4">
                        <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Tahlil natijasi</h5>
                        <div className="flex flex-col items-center justify-center py-6 text-center opacity-30">
                          <Activity className="w-8 h-8 mb-2" />
                          <p className="text-[10px] font-medium">Rasm yuklang va tahlil tugmasini bosing</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/30">
            <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mb-6">
              <Leaf className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Maydonni tanlang</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Chap tarafdagi ro'yxatdan biror maydonni tanlang yoki yangisini qo'shish uchun xaritaga o'ting.
            </p>
            <button 
              onClick={() => navigate(ROUTES.FIELD)}
              className="mt-6 bg-white border border-border px-6 py-2.5 rounded-xl text-sm font-bold text-foreground hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-green-600" />
              Yangi maydon qo'shish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
