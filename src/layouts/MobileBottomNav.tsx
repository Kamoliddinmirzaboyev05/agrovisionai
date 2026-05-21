import { useNavigate, useLocation } from 'react-router';
import { Home, Map, BarChart3, User } from 'lucide-react';
import { ROUTES } from '@/router/routes';

const NAV_ITEMS = [
  { path: ROUTES.HOME, icon: Home, label: 'Bosh sahifa' },
  { path: ROUTES.FIELD, icon: Map, label: 'Dala' },
  { path: ROUTES.HISTORY, icon: BarChart3, label: 'Natijalar' },
  { path: ROUTES.PROFILE, icon: User, label: 'Profil' },
];

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === ROUTES.HOME) return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="flex-shrink-0 bg-white border-t border-border flex items-center shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
        const active = isActive(path);
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-1 transition-colors ${
              active ? 'text-green-600' : 'text-muted-foreground'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${active ? 'bg-green-100' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold leading-none">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
