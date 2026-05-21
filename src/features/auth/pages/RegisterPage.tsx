import { Navigate, Link } from 'react-router';
import { Leaf, Sprout, BarChart3, Droplets } from 'lucide-react';
import { RegisterForm } from '../components/RegisterForm';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '@/router/routes';

export function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-green-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left branding panel — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -right-16 w-96 h-96 bg-white/5 rounded-full" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mb-8 shadow-2xl backdrop-blur-sm">
            <Leaf className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold mb-3 tracking-tight">AgroVision AI</h1>
          <p className="text-green-100 text-lg font-medium mb-6 leading-snug">
            Sun'iy yo'ldosh, AI va ob-havo asosida aqlli fermer yordamchisi
          </p>
          <p className="text-green-200 text-sm leading-relaxed mb-10">
            Bugun ro'yxatdan o'ting va dalangizni aqlli boshqarishni boshlang.
          </p>

          <div className="grid grid-cols-3 gap-4 w-full">
            {[
              { icon: Sprout, label: 'Ekin tahlili' },
              { icon: BarChart3, label: 'AI natijalar' },
              { icon: Droplets, label: "Aqlli sug'orish" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="bg-white/10 rounded-2xl p-4 flex flex-col items-center gap-2 backdrop-blur-sm">
                <Icon className="w-6 h-6 text-white" />
                <p className="text-xs font-semibold text-green-100">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">
        {/* Mobile logo */}
        <div className="flex lg:hidden flex-col items-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-green-700">AgroVision AI</h1>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-extrabold text-foreground mb-1">Hisob yaratish</h2>
          <p className="text-sm text-muted-foreground mb-8">Ma'lumotlaringizni kiriting</p>

          <RegisterForm />

          <p className="text-center text-sm text-muted-foreground mt-6">
            Hisobingiz bormi?{' '}
            <Link
              to={ROUTES.LOGIN}
              className="text-green-600 font-semibold hover:text-green-700 hover:underline transition-colors"
            >
              Kirish
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
