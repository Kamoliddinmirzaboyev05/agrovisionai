import { Check, Crown, MessageCircle, HelpCircle, Zap, ShieldCheck, Sprout } from "lucide-react";

export function PricingPage() {
  const plans = [
    {
      name: "Bepul",
      price: "Bepul",
      subtitle: "Yangi boshlovchilar uchun",
      icon: Sprout,
      features: [
        "1 ta dala qo‘shish",
        "Maydonni o‘lchash",
        "Oyiga 5 ta rasm tahlili",
        "Asosiy ob-havo ma’lumoti",
        "Asosiy AI tavsiyalar",
      ],
      buttonText: "Hozir boshlash",
      highlight: false,
    },
    {
      name: "Pro",
      price: "199 000 so‘m",
      period: "/ oy",
      subtitle: "Professional fermerlar uchun",
      icon: Zap,
      badge: "Eng ko'p tanlangan",
      features: [
        "10 tagacha dala qo‘shish",
        "500 ta rasm tahlili / oy",
        "Sun’iy yo‘ldosh orqali NDVI",
        "Sug‘orish va o‘g‘itlash rejasi",
        "PDF hisobotlarni yuklash",
        "Tahlil tarixi (6 oy)",
      ],
      buttonText: "Pro'ga o‘tish",
      highlight: true,
    },
    {
      name: "Max",
      price: "299 000 so‘m",
      period: "/ oy",
      subtitle: "Katta xo'jaliklar uchun",
      icon: Crown,
      badge: "Premium imkoniyat",
      features: [
        "Cheksiz dalalar qo‘shish",
        "Cheksiz AI rasm tahlili",
        "Kasalliklarni aniqlash (Premium AI)",
        "Tuproq tahlili (Yo'ldosh orqali)",
        "24/7 Priority qo'llab-quvvatlash",
        "Shaxsiy agronom maslahati",
        "Tahlil tarixi (Cheksiz)",
        "API integratsiya",
      ],
      buttonText: "Max'ga o‘tish",
      highlight: false,
      isMax: true,
    },
  ];

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-700">
      <div className="text-center space-y-4 mb-4">
        <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
          Tarif Rejalari
        </h1>
        <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
          Ehtiyojingizga mos tarifni tanlang va zamonaviy texnologiyalar yordamida hosildorlikni yangi bosqichga olib chiqing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative bg-white rounded-[2.5rem] p-8 border-2 transition-all duration-500 shadow-sm hover:shadow-2xl flex flex-col group ${
              plan.highlight
                ? "border-primary lg:scale-105 z-10 ring-8 ring-primary/5"
                : plan.isMax 
                  ? "border-amber-400/50 bg-gradient-to-b from-white to-amber-50/20"
                  : "border-border hover:border-primary/30"
            }`}
          >
            {plan.badge && (
              <div className={`absolute -top-4 left-1/2 -translate-x-1/2 text-white text-[10px] uppercase tracking-widest font-black px-6 py-2 rounded-full shadow-xl ${
                plan.isMax ? "bg-amber-500" : "bg-primary"
              }`}>
                {plan.badge}
              </div>
            )}

            <div className="mb-8">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500 ${
                plan.highlight ? "bg-primary text-white shadow-lg shadow-primary/20" : 
                plan.isMax ? "bg-amber-100 text-amber-600 shadow-lg shadow-amber-200/50" : 
                "bg-gray-100 text-gray-600"
              }`}>
                <plan.icon className="w-7 h-7" />
              </div>
              <p className="text-2xl font-black text-foreground mb-1">{plan.name}</p>
              <p className="text-xs font-medium text-muted-foreground mb-6">{plan.subtitle}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-foreground">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground font-bold text-sm">{plan.period}</span>
                )}
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-8" />

            <ul className="space-y-4 mb-10 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 group/item">
                  <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    plan.highlight ? 'bg-primary/10 group-hover/item:bg-primary/20' : 
                    plan.isMax ? 'bg-amber-100 group-hover/item:bg-amber-200' :
                    'bg-gray-100 group-hover/item:bg-gray-200'
                  }`}>
                    <Check className={`w-3 h-3 ${
                      plan.highlight ? 'text-primary' : 
                      plan.isMax ? 'text-amber-600' :
                      'text-gray-500'
                    }`} />
                  </div>
                  <span className="text-sm font-semibold text-foreground/80 leading-tight">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <button
              className={`w-full py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg ${
                plan.highlight
                  ? "bg-primary text-white hover:shadow-primary/30 hover:-translate-y-1"
                  : plan.isMax
                    ? "bg-amber-500 text-white hover:bg-amber-600 hover:shadow-amber-500/30 hover:-translate-y-1"
                    : "bg-gray-900 text-white hover:bg-black hover:-translate-y-1"
              }`}
            >
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>

      {/* Corporate Section */}
      <div className="mt-12 bg-gray-900 rounded-[3rem] p-8 md:p-12 overflow-hidden relative group">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 flex items-center justify-center flex-shrink-0 shadow-2xl">
            <ShieldCheck className="w-10 h-10 md:w-12 md:h-12 text-primary" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl md:text-3xl font-black text-white mb-4">
              Korporativ yechimlar
            </h3>
            <p className="text-gray-400 text-sm md:text-lg leading-relaxed max-w-2xl">
              Katta fermer xo‘jaliklari, klasterlar va agrosanoat majmualari uchun maxsus dashboard, ko'p foydalanuvchili tizim va individual tahlillar taqdim etamiz.
            </p>
          </div>
          <button className="flex-shrink-0 bg-primary text-white font-black text-sm uppercase tracking-widest px-12 py-5 rounded-[1.5rem] shadow-2xl hover:bg-green-500 hover:-translate-y-1 active:scale-95 transition-all">
            Bog‘lanish
          </button>
        </div>
      </div>

      {/* FAQ/Trust Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className="bg-primary/5 rounded-[2.5rem] p-8 border border-primary/10 flex items-start gap-6">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-foreground mb-2">Nega tarifni yangilash kerak?</h4>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Premium tariflar yordamida siz nafaqat monitoring, balki aniq AI tavsiyalar, kasalliklarni barvaqt aniqlash va sug'orishni optimallashtirish imkoniga ega bo'lasiz. Bu xarajatlarni 20% gacha kamaytiradi.
            </p>
          </div>
        </div>
        <div className="bg-blue-50/50 rounded-[2.5rem] p-8 border border-blue-100 flex items-start gap-6">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-foreground mb-2">Xavfsizlik kafolati</h4>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Sizning ma'lumotlaringiz to'liq himoyalangan va faqat sizga tegishli. Biz eng zamonaviy bulutli texnologiyalar va shifrlash usullaridan foydalanamiz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
