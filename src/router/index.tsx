import { createBrowserRouter, RouterProvider, Navigate } from 'react-router';
import { AuthProvider } from '@/store/authStore';
import { ConfirmProvider } from '@/store/ConfirmContext';
import { Toaster } from '@/app/components/ui/sonner';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { FieldPage } from '@/features/field/pages/FieldPage';
import { MyFieldsPage } from '@/features/field/pages/MyFieldsPage';
import { UploadPage } from '@/features/analysis/pages/UploadPage';
import { LoadingPage } from '@/features/analysis/pages/LoadingPage';
import { ResultPage } from '@/features/analysis/pages/ResultPage';
import { HistoryPage } from '@/features/history/pages/HistoryPage';
import { ProfilePage } from '@/features/profile/pages/ProfilePage';
import PricingPage from '@/features/pricing/pages/PricingPage';
import { ROUTES } from './routes';

const router = createBrowserRouter([
  // Auth routes (redirect to home if already authenticated)
  {
    element: <AuthLayout />,
    children: [
      { path: ROUTES.LOGIN, element: <LoginPage /> },
      { path: ROUTES.REGISTER, element: <RegisterPage /> },
    ],
  },
  // Protected app routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: ROUTES.HOME, element: <DashboardPage /> },
          { path: ROUTES.FIELD, element: <FieldPage /> },
          { path: ROUTES.MY_FIELDS, element: <MyFieldsPage /> },
          { path: ROUTES.UPLOAD, element: <UploadPage /> },
          { path: ROUTES.LOADING, element: <LoadingPage /> },
          { path: ROUTES.RESULT, element: <ResultPage /> },
          { path: ROUTES.HISTORY, element: <HistoryPage /> },
          { path: ROUTES.PROFILE, element: <ProfilePage /> },
          { path: ROUTES.PRICING, element: <PricingPage /> },
        ],
      },
    ],
  },
  // Catch-all
  { path: '*', element: <Navigate to={ROUTES.HOME} replace /> },
]);

export function AppRouter() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" richColors />
      </ConfirmProvider>
    </AuthProvider>
  );
}
