import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '@/router/routes';
import type { RegisterFormData } from '../types';

export function RegisterForm() {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<RegisterFormData>>({});
  const [serverError, setServerError] = useState('');

  const validate = (): boolean => {
    const newErrors: Partial<RegisterFormData> = {};
    if (!form.name.trim()) newErrors.name = "Ism kiritilishi shart";
    if (!form.email.trim()) newErrors.email = "Email kiritilishi shart";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Email noto'g'ri formatda";
    if (!form.password) newErrors.password = "Parol kiritilishi shart";
    else if (form.password.length < 6) newErrors.password = "Parol kamida 6 ta belgidan iborat bo'lishi kerak";
    if (!form.confirmPassword) newErrors.confirmPassword = "Parolni tasdiqlang";
    else if (form.password !== form.confirmPassword) newErrors.confirmPassword = "Parollar mos kelmaydi";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    try {
      await register(form.name, form.email, form.password);
      navigate(ROUTES.HOME, { replace: true });
    } catch {
      setServerError("Ro'yxatdan o'tish amalga oshmadi. Qayta urinib ko'ring.");
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
        <label className="text-sm font-semibold text-foreground">Ism va familiya</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Jasur Abdullayev"
          className={`w-full bg-white border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 transition-all ${
            errors.name ? 'border-red-400' : 'border-border'
          }`}
          autoComplete="name"
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-foreground">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="email@example.com"
          className={`w-full bg-white border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 transition-all ${
            errors.email ? 'border-red-400' : 'border-border'
          }`}
          autoComplete="email"
        />
        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
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
          autoComplete="new-password"
        />
        {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-foreground">Parolni tasdiqlang</label>
        <input
          type="password"
          value={form.confirmPassword}
          onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
          placeholder="••••••••"
          className={`w-full bg-white border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 transition-all ${
            errors.confirmPassword ? 'border-red-400' : 'border-border'
          }`}
          autoComplete="new-password"
        />
        {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
        Ro'yxatdan o'tish
      </button>
    </form>
  );
}
