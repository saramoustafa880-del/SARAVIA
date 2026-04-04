'use client';

export const runtime = 'edge';

import { useMemo } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { usePiAuth } from '../../hooks/usePiAuth';
import { usePiPayment } from '../../hooks/usePiPayment';
import { useTravelStore } from '../../store/useTravelStore';

export default function DashboardPage() {
  const { user, jwt, signIn, rotateSession } = usePiAuth();
  const { destination, budgetPi, checkIn, checkOut } = useTravelStore();
  const { createLuxuryPayment, status, error, treasuryWallet } = usePiPayment(jwt);

  const bookingReference = useMemo(
    () => `SV-${destination.slice(0, 3).toUpperCase()}-${checkIn.replaceAll('-', '')}`,
    [destination, checkIn]
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
      <GlassCard title="لوحة التحكم" subtitle="إدارة الحجوزات الفاخرة ومدفوعات Pi">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-300">الحالة الحالية للمستخدم</p>
            <h1 className="text-3xl font-semibold">{user ? user.username ?? user.uid : 'غير متصل'}</h1>
          </div>
          <div className="flex gap-3">
            {!user && (
              <button
                type="button"
                onClick={() => void signIn()}
                className="rounded-full bg-white px-5 py-3 font-semibold text-ink"
              >
                تسجيل الدخول الآن
              </button>
            )}
            {user && (
              <button
                type="button"
                onClick={() => void rotateSession()}
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white"
              >
                تدوير الجلسة
              </button>
            )}
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <GlassCard title="أمر حجز فاخر" subtitle="هذا النموذج يفتح Pi Wallet ثم يفعّل التحقق الخادمي الكامل">
          <div className="grid gap-4 text-sm">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p>الوجهة: {destination}</p>
              <p>الفترة: {checkIn} → {checkOut}</p>
              <p>القيمة: {budgetPi} Pi</p>
              <p>المرجع: {bookingReference}</p>
              {treasuryWallet && <p className="break-all">محفظة الاستقبال: {treasuryWallet}</p>}
            </div>
            <button
              type="button"
              disabled={!user || !jwt}
              onClick={() =>
                void createLuxuryPayment({
                  uid: user?.uid ?? '',
                  bookingReference,
                  amount: budgetPi,
                  memo: `SARA VIA luxury stay in ${destination}`,
                  metadata: {
                    destination,
                    checkIn,
                    checkOut,
                    tier: 'luxury',
                    domain: 'https://sara-via.netlify.app'
                  }
                })
              }
              className="rounded-full bg-gradient-to-r from-[#ebd09a] to-[#b98a43] px-5 py-3 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              ادفع الآن عبر Pi
            </button>
          </div>
        </GlassCard>

        <GlassCard title="Payment Status" subtitle="تعقب مباشر للحالة من الواجهة">
          <p className="text-lg font-semibold text-white">{status}</p>
          {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
          <div className="mt-6 space-y-2 text-sm text-slate-300">
            <p>1. Create intent في السيرفر.</p>
            <p>2. التحقق من عنوان المحفظة المستقبلة قبل approve.</p>
            <p>3. حماية Rate Limit و JWT rotation.</p>
            <p>4. منع webhook replay وتسجيل أثر كامل.</p>
            <p>5. Queue لإعادة reconciliation عند تعثر الشبكة.</p>
          </div>
        </GlassCard>
      </div>
    </main>
  );
}
