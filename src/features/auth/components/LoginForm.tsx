import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '@/router/routes';
import type { LoginFormData } from '../types';

export function LoginForm() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginFormData>({ username: '', password: '' });
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [serverError, setServerError] = useState('');

  const validate = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};
    if (!form.username.trim()) newErrors.username = "Username kiritilishi shart";
    if (!form.password) newErrors.password = "Parol kiritilishi shart";
    else if (form.password.length < 6) newErrors.password = "Parol kamida 6 ta belgidan iborat bo'lishi kerak";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    try {
      await login(form.username, form.password);
      navigate(ROUTES.HOME, { replace: true });
    } catch (err: any) {
      setServerError(err.message || "Kirish amalga oshmadi. Qayta urinib ko'ring.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {serverError}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-foreground">Username</label>
        <input
          type="text"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          placeholder="username"
          className={`w-full bg-white border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 transition-all ${
            errors.username ? 'border-red-400' : 'border-border'
          }`}
          autoComplete="username"
        />
        {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-foreground">Parol</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          placeholder="••••••••"
          className={`w-full bg-white border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 transition-all ${
            errors.password ? 'border-red-400' : 'border-border'
          }`}
          autoComplete="current-password"
        />
        {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
        Kirish
      </button>
    </form>
  );
}
