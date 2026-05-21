import { createContext, useContext, useReducer, useEffect, type ReactNode, createElement } from 'react';
import type { User, AuthState } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────────

type AuthAction =
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'agrovision_user';

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

// ── Provider ───────────────────────────────────────────────────────────────────

function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const user: User = JSON.parse(stored);
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = async (email: string, _password: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 600));
    const user: User = {
      id: crypto.randomUUID(),
      name: email.split('@')[0].replace(/[._]/g, ' '),
      email,
      region: 'Toshkent viloyati',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    dispatch({ type: 'LOGIN_SUCCESS', payload: user });
  };

  const register = async (name: string, email: string, _password: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    await new Promise((r) => setTimeout(r, 600));
    const user: User = {
      id: crypto.randomUUID(),
      name,
      email,
      region: 'Toshkent viloyati',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    dispatch({ type: 'LOGIN_SUCCESS', payload: user });
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'LOGOUT' });
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
