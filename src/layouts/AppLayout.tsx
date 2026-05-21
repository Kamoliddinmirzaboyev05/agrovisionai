import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Leaf } from 'lucide-react';
import { DesktopSidebar } from './DesktopSidebar';
import { DesktopHeader } from './DesktopHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ROUTES } from '@/router/routes';

// Routes where the mobile header/nav should be hidden (full-screen pages)
const HIDE_MOBILE_CHROME = [ROUTES.LOADING];

// Routes that show a header title on mobile
const MOBILE_HEADER_TITLES: Record<string, string> = {
  [ROUTES.FIELD]: 'AgroVision AI',
  [ROUTES.UPLOAD]: 'AgroVision AI',
  [ROUTES.RESULT]: 'Tahlil Natijalari',
  [ROUTES.HISTORY]: 'AgroVision AI',
  [ROUTES.PROFILE]: 'AgroVision AI',
};

export function AppLayout() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const hideChrome = HIDE_MOBILE_CHROME.includes(location.pathname as typeof ROUTES[keyof typeof ROUTES]);
  const mobileHeaderTitle = MOBILE_HEADER_TITLES[location.pathname];
  const isResult = location.pathname === ROUTES.RESULT;

  // ── Desktop Layout ──────────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <div
        className="flex bg-background"
        style={{ height: '100dvh', fontFamily: "'Plus Jakarta Sans', 'Noto Sans', sans-serif" }}
      >
        <DesktopSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <DesktopHeader onMenuToggle={() => setSidebarCollapsed((c) => !c)} />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  // ── Mobile Layout ───────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col bg-background"
      style={{ height: '100dvh', maxWidth: 480, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', 'Noto Sans', sans-serif" }}
    >
      {!hideChrome && mobileHeaderTitle && (
        <div className="flex-shrink-0 bg-white border-b border-border px-5 py-4 flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-green-700 text-base tracking-tight">{mobileHeaderTitle}</span>
          {isResult && (
            <div className="ml-auto bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
              O'rtacha xavf
            </div>
          )}
        </div>
      )}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </div>
      {!hideChrome && <MobileBottomNav />}
    </div>
  );
}
