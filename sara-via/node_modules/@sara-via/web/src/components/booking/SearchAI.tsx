'use client';

import { Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';

interface SearchAIProps {
  onSearch: (query: string) => Promise<void> | void;
}

export function SearchAI({ onSearch }: SearchAIProps) {
  const [query, setQuery] = useState('Find a luxury stay in Paris for 500 Pi');

  return (
    <GlassCard
      title="Sara AI Concierge"
      subtitle="ابحث بلغة طبيعية وسيتم تحويل الطلب إلى مسار حجز فاخر مرتبط بالدفع عبر Pi"
      className="bg-gradient-to-br from-white/15 to-white/5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
          <Sparkles className="h-5 w-5 text-gold" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
            placeholder="مثال: Find a luxury stay in Paris for 500 Pi"
          />
        </div>
        <button
          type="button"
          onClick={() => onSearch(query)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#e8c78a] to-[#b98a43] px-5 py-3 font-semibold text-ink transition hover:scale-[1.02]"
        >
          <Search className="h-4 w-4" />
          ابحث الآن
        </button>
      </div>
    </GlassCard>
  );
}
