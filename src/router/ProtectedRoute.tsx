import { Navigate, Outlet } from 'react-router';
import { useAuthContext } from '@/store/authStore';
import { ROUTES } from './routes';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-green-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
