import { useState, useEffect } from 'react';
import { User, Globe, MapPin, Bell, HelpCircle, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNavigate } from 'react-router';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ROUTES } from '@/router/routes';

export function ProfilePage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/satellite/history/", { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setHistory(data.results || []);
      })
      .catch((err) => console.error("History fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  const historyCount = history.length;
  const totalAreaHa = history.reduce((acc, curr) => acc + (curr.area_ha || 0), 0);
  const totalSotix = Math.round(totalAreaHa * 100);
  const uniqueFields = new Set(history.map(h => h.name)).size;

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const displayName = user?.first_name || user?.username || '';
  const displayRegion = user?.region || 'Hudud belgilanmagan';
  const displayEmail = user?.email || '';
  const dateJoined = user?.date_joined ? new Date(user.date_joined).toLocaleDateString('uz-UZ') : '';

  const settingsCard = (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
        <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center">
          <Globe className="w-4 h-4 text-green-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Til</p>
          <p className="text-xs text-muted-foreground">O'zbek tili</p>
        </div>
        <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">UZ</span>
      </div>
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
          <MapPin className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Hudud</p>
          <p className="text-xs text-muted-foreground">{displayRegion}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
          <Bell className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Bildirishnomalar</p>
          <p className="text-xs text-muted-foreground">Kundalik tavsiyalar</p>
        </div>
        <button
          onClick={() => setNotifications((n) => !n)}
          className={`relative w-12 h-6 rounded-full transition-colors ${notifications ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              notifications ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );

  const statsCard = (
    <div className="bg-primary rounded-2xl p-5 text-white flex justify-around shadow-sm">
      <div className="text-center">
        <p className="text-2xl font-extrabold">{loading ? "..." : historyCount}</p>
        <p className="text-xs opacity-80">Tahlillar</p>
      </div>
      <div className="w-px bg-white/20" />
      <div className="text-center">
        <p className="text-2xl font-extrabold">{loading ? "..." : uniqueFields}</p>
        <p className="text-xs opacity-80">Dalalar</p>
      </div>
      <div className="w-px bg-white/20" />
      <div className="text-center">
        <p className="text-2xl font-extrabold">{loading ? "..." : totalSotix}</p>
        <p className="text-xs opacity-80">Sotix</p>
      </div>
    </div>
  );

  const helpBtn = (
    <button className="w-full bg-white border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:bg-gray-50 transition-colors">
      <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center">
        <HelpCircle className="w-4 h-4 text-purple-600" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold text-foreground">Yordam</p>
        <p className="text-xs text-muted-foreground">Qo'llanma va FAQ</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );

  const logoutBtn = (
    <button
      onClick={handleLogout}
      className="w-full bg-white border border-red-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:bg-red-50 transition-colors"
    >
      <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
        <LogOut className="w-4 h-4 text-red-600" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold text-red-600">Chiqish</p>
        <p className="text-xs text-muted-foreground">Hisobdan chiqish</p>
      </div>
    </button>
  );

  if (!isMobile) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto w-full">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Profil</h2>
          <p className="text-sm text-muted-foreground mt-1">Shaxsiy ma'lumotlar va sozlamalar</p>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {/* Left: avatar + stats */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col items-center gap-3">
              <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-lg">
                <User className="w-10 h-10 text-white" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground">{displayEmail}</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs font-medium text-muted-foreground">{displayRegion}</p>
                {dateJoined && (
                  <p className="text-[10px] text-muted-foreground/60">
                    A'zo bo'ldi: {dateJoined}
                  </p>
                )}
              </div>
            </div>
            {statsCard}
          </div>
          {/* Right: settings */}
          <div className="col-span-2 flex flex-col gap-4">
            <h3 className="font-bold text-foreground">Sozlamalar</h3>
            {settingsCard}
            {helpBtn}
            {logoutBtn}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-4 pt-5">
      <div className="flex flex-col items-center py-6 text-center">
        <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-lg mb-3">
          <User className="w-10 h-10 text-white" />
        </div>
        <p className="text-xl font-bold text-foreground">{displayName}</p>
        <p className="text-sm text-muted-foreground">{displayEmail}</p>
        <p className="text-xs text-muted-foreground mt-1">{displayRegion}</p>
        {dateJoined && (
          <p className="text-[10px] text-muted-foreground/50 mt-1">
            A'zo bo'ldi: {dateJoined}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {settingsCard}
        {helpBtn}
        {statsCard}
        {logoutBtn}
      </div>
    </div>
  );
}
