import { createContext, useContext, useReducer, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import type { User, AuthState } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────────

type AuthAction =
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (first_name: string, username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const API_BASE = '/api/auth';

// ── Reducer ────────────────────────────────────────────────────────────────────

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return { ...state, user: action.payload, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Check auth on mount
  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/me/`, {
          credentials: 'include',
        });
        
        if (!isMounted) return;

        if (res.status === 404) {
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        const data = await res.json();
        if (data.authenticated && data.user) {
          dispatch({ type: 'LOGIN_SUCCESS', payload: data.user });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (err) {
        if (isMounted) {
          console.error('Auth check failed:', err);
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    };

    checkAuth();
    return () => { isMounted = false; };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const csrftoken = getCookie('csrftoken');
      const res = await fetch(`${API_BASE}/login/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(csrftoken ? { 'X-CSRFToken': csrftoken } : {}),
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.message || 'Login xatosi');
      }

      const meRes = await fetch(`${API_BASE}/me/`, { credentials: 'include' });
      const meData = await meRes.json();
      
      if (meData.authenticated && meData.user) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: meData.user });
      } else {
        throw new Error('Foydalanuvchi ma\'lumotlarini olishda xatolik');
      }
    } catch (err: any) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw err;
    }
  }, []);

  const register = useCallback(async (first_name: string, username: string, email: string, password: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const csrftoken = getCookie('csrftoken');
      const res = await fetch(`${API_BASE}/register/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(csrftoken ? { 'X-CSRFToken': csrftoken } : {}),
        },
        body: JSON.stringify({ first_name, username, email, password }),
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.message || 'Ro\'yxatdan o\'tish xatosi');
      }

      const meRes = await fetch(`${API_BASE}/me/`, { credentials: 'include' });
      const meData = await meRes.json();
      
      if (meData.authenticated && meData.user) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: meData.user });
      } else {
        throw new Error('Foydalanuvchi ma\'lumotlarini olishda xatolik');
      }
    } catch (err: any) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/logout/`, { 
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const value = useMemo(() => ({
    ...state,
    login,
    register,
    logout
  }), [state, login, register, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
