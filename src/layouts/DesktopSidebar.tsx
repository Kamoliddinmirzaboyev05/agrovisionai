import { useNavigate, useLocation } from 'react-router';
import {
  Leaf,
  Map,
  BarChart3,
  User,
  LayoutDashboard,
  CreditCard,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROUTES } from '@/router/routes';

interface DesktopSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const SIDEBAR_ITEMS = [
  { path: ROUTES.HOME, icon: LayoutDashboard, label: 'Bosh sahifa' },
  { path: ROUTES.FIELD, icon: Map, label: 'Dala xaritasi' },
  { path: ROUTES.HISTORY, icon: BarChart3, label: 'Tahlil tarixi' },
  { path: ROUTES.PRICING, icon: CreditCard, label: 'Tariflar' },
  { path: ROUTES.PROFILE, icon: User, label: 'Profil' },
];

export function DesktopSidebar({ collapsed, onToggle }: DesktopSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const isActive = (path: string) => {
    if (path === ROUTES.HOME) return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <aside
      className={`flex-shrink-0 bg-white border-r border-border flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
      style={{ height: '100vh' }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-border ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="font-extrabold text-green-700 text-base tracking-tight">AgroVision AI</span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 px-2 py-4">
        {SIDEBAR_ITEMS.map(({ path, icon: Icon, label }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            title={collapsed ? label : undefined}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl font-semibold text-sm transition-all w-full ${
              isActive(path)
                ? 'bg-green-100 text-green-700'
                : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground'
            } ${collapsed ? 'justify-center' : ''}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom: settings + logout + collapse */}
      <div className="px-2 pb-4 flex flex-col gap-1 border-t border-border pt-3">
        <button
          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-muted-foreground hover:bg-gray-100 transition-all w-full ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Sozlamalar"
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sozlamalar</span>}
        </button>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all w-full ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Chiqish"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Chiqish</span>}
        </button>
        <button
          onClick={onToggle}
          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-muted-foreground hover:bg-gray-100 transition-all w-full ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? 'Kengaytirish' : "Yig'ish"}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span>Yig'ish</span>}
        </button>
      </div>
    </aside>
  );
}
