import { useLocation } from 'react-router';
import { Menu, User } from 'lucide-react';
import { ROUTES } from '@/router/routes';

interface DesktopHeaderProps {
  onMenuToggle: () => void;
}

const ROUTE_TITLES: Record<string, string> = {
  [ROUTES.HOME]: 'Bosh sahifa',
  [ROUTES.FIELD]: 'Dala Xaritasi',
  [ROUTES.UPLOAD]: 'Rasm Yuklash',
  [ROUTES.LOADING]: 'Tahlil jarayoni',
  [ROUTES.RESULT]: 'Tahlil Natijalari',
  [ROUTES.HISTORY]: 'Tahlil Tarixi',
  [ROUTES.PROFILE]: 'Profil',
};

export function DesktopHeader({ onMenuToggle }: DesktopHeaderProps) {
  const location = useLocation();
  const title = ROUTE_TITLES[location.pathname] ?? 'AgroVision AI';
  const isResult = location.pathname === ROUTES.RESULT;

  return (
    <header className="flex-shrink-0 bg-white border-b border-border px-6 py-4 flex items-center gap-4 shadow-sm">
      <button
        onClick={onMenuToggle}
        className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-muted-foreground"
      >
        <Menu className="w-5 h-5" />
      </button>
      <h1 className="font-extrabold text-foreground text-lg flex-1">{title}</h1>
      {isResult && (
        <div className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full">O'rtacha xavf</div>
      )}
      <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-green-700 rounded-xl flex items-center justify-center shadow">
        <User className="w-5 h-5 text-white" />
      </div>
    </header>
  );
}
