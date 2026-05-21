import { Check, Crown, CreditCard, MessageCircle, HelpCircle } from "lucide-react";

export default function PricingPage() {
  const plans = [
    {
      name: "Bepul tarif",
      price: "Bepul",
      subtitle: "Sinab ko‘rish uchun",
      features: [
        "1 ta dala qo‘shish",
        "Maydonni o‘lchash",
        "Oyiga 3 ta rasm tahlili",
        "Oddiy ob-havo ma’lumoti",
        "Asosiy AI tavsiya",
        "Oddiy suv tavsiyasi",
      ],
      buttonText: "Bepul boshlash",
      highlight: false,
    },
    {
      name: "Pro tarif",
      price: "199 000 so‘m",
      period: "/ oy",
      subtitle: "Doimiy fermerlar uchun",
      badge: "Tavsiya etiladi",
      features: [
        "5 tagacha dala",
        "1000 tagacha rasm tahlili",
        "Sun’iy yo‘ldosh orqali NDVI tahlili",
        "Suv xavfi va sug‘orish tavsiyasi",
        "Kasallik va zararkunanda bo‘yicha batafsil tavsiya",
        "PDF hisobot yuklab olish",
        "Telegram ogohlantirishlar",
        "Tahlil tarixi",
      ],
      buttonText: "Pro tarifga o‘tish",
      highlight: true,
    },
  ];

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
          Tarif Rejalari
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          O‘zingizga mos tarifni tanlang va AgroVision AI bilan hosildorlikni oshiring.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative bg-white rounded-3xl p-6 md:p-8 border-2 transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col ${
              plan.highlight
                ? "border-primary scale-100 md:scale-105"
                : "border-border"
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                {plan.badge}
              </div>
            )}

            <div className="mb-8">
              <p className="text-lg font-bold text-foreground mb-1">{plan.name}</p>
              <p className="text-xs text-muted-foreground mb-4">{plan.subtitle}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-foreground">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground font-medium">{plan.period}</span>
                )}
              </div>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${plan.highlight ? 'bg-primary/10' : 'bg-gray-100'}`}>
                    <Check className={`w-3 h-3 ${plan.highlight ? 'text-primary' : 'text-gray-500'}`} />
                  </div>
                  <span className="text-sm md:text-base text-foreground/80 font-medium">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <button
              className={`w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95 shadow-lg ${
                plan.highlight
                  ? "bg-primary text-white hover:opacity-90"
                  : "bg-gray-100 text-foreground hover:bg-gray-200"
              }`}
            >
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>

      {/* Cluster/Large Farm Section */}
      <div className="bg-gray-50 rounded-3xl p-6 md:p-10 border border-border flex flex-col md:flex-row items-center gap-6 md:gap-10">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-3xl flex items-center justify-center flex-shrink-0">
          <MessageCircle className="w-8 h-8 md:w-10 md:h-10 text-primary" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl md:text-2xl font-extrabold text-foreground mb-2">
            Katta fermer xo‘jaliklari va klasterlar uchun
          </h3>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            Ko‘p dala monitoringi, umumiy dashboard va maxsus hisobotlar uchun biz bilan bog‘laning. Biz sizning xo‘jaligingiz uchun maxsus yechimlar tayyorlaymiz.
          </p>
        </div>
        <button className="flex-shrink-0 bg-foreground text-white font-bold text-base px-10 py-4 rounded-2xl shadow-xl hover:opacity-90 active:scale-95 transition-all flex items-center gap-3">
          Bog‘lanish
        </button>
      </div>

      {/* Why Pro Card */}
      <div className="bg-primary/5 rounded-3xl p-6 md:p-8 border border-primary/10 flex flex-col md:flex-row items-start gap-6">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
          <HelpCircle className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-foreground mb-2">Nega Pro tarif?</h4>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            Pro tarif orqali fermer dalalarini doimiy kuzatadi, kasallik va suv xavfi haqida oldindan ogohlantirish oladi hamda hosilni saqlab qolish uchun aniq tavsiyalarga ega bo‘ladi. Bu hosildorlikni 20-30% gacha oshirish imkonini beradi.
          </p>
        </div>
      </div>
    </div>
  );
}
