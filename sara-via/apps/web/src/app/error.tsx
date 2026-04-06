'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="flex min-h-screen items-center justify-center bg-ink p-6 text-white">
        <div className="max-w-lg rounded-[28px] border border-white/10 bg-white/10 p-8 text-center backdrop-blur-xl">
          <h1 className="text-2xl font-bold">تعذر إكمال العملية</h1>
          <p className="mt-3 text-slate-300">{error.message}</p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-full bg-white px-5 py-3 font-semibold text-ink"
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
