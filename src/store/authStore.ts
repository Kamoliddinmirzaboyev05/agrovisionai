import { createContext, useContext, useReducer, useEffect, type ReactNode, createElement } from 'react';
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
      return { user: action.payload, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':
      return { user: null, isAuthenticated: false, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// ── Provider ───────────────────────────────────────────────────────────────────

function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/me/`, {
          credentials: 'include',
        });
        if (res.status === 404) {
          console.warn('Auth check endpoint not found (404)');
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
        console.error('Auth check failed:', err);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    checkAuth();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
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
        console.error('Login error details:', err);
        throw new Error(err.detail || err.message || 'Login xatosi');
      }

      // After login, fetch user info
      const meRes = await fetch(`${API_BASE}/me/`, {
        credentials: 'include',
      });
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
  };

  const register = async (first_name: string, username: string, email: string, password: string): Promise<void> => {
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
        console.error('Register error details:', err);
        throw new Error(err.detail || err.message || 'Ro\'yxatdan o\'tish xatosi');
      }

      // After register, fetch user info
      const meRes = await fetch(`${API_BASE}/me/`, {
        credentials: 'include',
      });
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
  };

  const logout = async () => {
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
  };

  return createElement(AuthContext.Provider, { value: { ...state, login, register, logout } }, children);
}

// ── Hook ───────────────────────────────────────────────────────────────────────

function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}

export { AuthProvider, useAuthContext, AuthContext };
