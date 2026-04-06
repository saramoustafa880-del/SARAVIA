'use client';

export const runtime = 'edge';

import { Plane, ShieldCheck, Wallet } from 'lucide-react';
import { SearchAI } from '../components/booking/SearchAI';
import { GlassCard } from '../components/ui/GlassCard';
import { usePiAuth } from '../hooks/usePiAuth';
import { useTravelStore } from '../store/useTravelStore';

export default function HomePage() {
  const { destination, budgetPi, checkIn, checkOut, travelers, setBookingData } = useTravelStore();
  const { user, isLoading, signIn, error } = usePiAuth();

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-10">
      <GlassCard className="overflow-hidden bg-gradient-to-br from-[#0f2240]/95 via-[#102847]/80 to-[#07111f]/95">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-gold">SARA VIA</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-white md:text-6xl">
              منصة سفر فاخرة متكاملة مع Pi Network وSara AI Concierge.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-200/85">
              واجهة حجز فاخرة، مصادقة Pi أصلية، وتحقق خادمي كامل لعمليات الدفع والتسوية.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void signIn()}
                className="rounded-full bg-gradient-to-r from-[#ebd09a] to-[#b98a43] px-5 py-3 font-semibold text-ink"
              >
                {isLoading ? 'جاري الربط مع Pi...' : user ? `مرحباً ${user.username ?? user.uid}` : 'تسجيل الدخول بـ Pi'}
              </button>
              <a href="/dashboard" className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white">
                فتح لوحة التحكم
              </a>
            </div>
            {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <GlassCard title="Pi Auth" subtitle="SSO آمن مع JWT RS256">
              <ShieldCheck className="h-8 w-8 text-gold" />
            </GlassCard>
            <GlassCard title="Luxury Booking" subtitle="تدفق متعدد الخطوات بواجهة Glassmorphism">
              <Plane className="h-8 w-8 text-gold" />
            </GlassCard>
            <GlassCard title="Pi Payments" subtitle="approve + complete + verify + audit trail">
              <Wallet className="h-8 w-8 text-gold" />
            </GlassCard>
          </div>
        </div>
      </GlassCard>

      <SearchAI
        onSearch={(query) => {
          const extractedBudget = Number(query.match(/(\d+)/)?.[1] ?? budgetPi);
          const extractedDestination = query.match(/in\s+([A-Za-z\s]+)/i)?.[1]?.trim() ?? destination;
          setBookingData({ budgetPi: extractedBudget, destination: extractedDestination });
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <GlassCard title="Luxury Trip Snapshot" subtitle="بيانات الحجز الحالية القادمة من المتجر المركزي">
          <dl className="grid grid-cols-2 gap-4 text-sm text-slate-100">
            <div>
              <dt className="text-slate-400">الوجهة</dt>
              <dd className="mt-1 text-lg font-semibold">{destination}</dd>
            </div>
            <div>
              <dt className="text-slate-400">الميزانية</dt>
              <dd className="mt-1 text-lg font-semibold">{budgetPi} Pi</dd>
            </div>
            <div>
              <dt className="text-slate-400">تاريخ الوصول</dt>
              <dd className="mt-1 text-lg font-semibold">{checkIn}</dd>
            </div>
            <div>
              <dt className="text-slate-400">تاريخ المغادرة</dt>
              <dd className="mt-1 text-lg font-semibold">{checkOut}</dd>
            </div>
            <div>
              <dt className="text-slate-400">عدد المسافرين</dt>
              <dd className="mt-1 text-lg font-semibold">{travelers}</dd>
            </div>
          </dl>
        </GlassCard>

        <GlassCard title="أداء الواجهة" subtitle="مصممة لتحقيق LCP منخفض وتشغيل Edge Runtime">
          <ul className="space-y-3 text-sm text-slate-200/90">
            <li>• الصفحات الأساسية تعمل على Edge Runtime لتقليل زمن الوصول العالمي.</li>
            <li>• مكونات العرض الأساسية قليلة الاعتماديات وتستخدم Tailwind مباشرة.</li>
            <li>• Error Boundaries موجودة على مستوى التطبيق لحماية تجربة المستخدم.</li>
          </ul>
        </GlassCard>
      </div>
    </main>
  );
}
