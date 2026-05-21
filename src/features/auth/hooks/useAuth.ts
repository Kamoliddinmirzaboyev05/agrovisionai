import { useAuthContext } from '@/store/authStore';

/**
 * Hook to access auth state and actions from any component.
 * Must be used inside AuthProvider.
 */
export function useAuth() {
  return useAuthContext();
}
