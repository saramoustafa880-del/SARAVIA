import { motion } from 'framer-motion';
import { PropsWithChildren } from 'react';

interface GlassCardProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function GlassCard({ title, subtitle, children, className = '' }: GlassCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`rounded-[28px] border border-white/15 bg-white/10 p-6 shadow-glass backdrop-blur-xl ${className}`}
    >
      {(title || subtitle) && (
        <header className="mb-4">
          {title && <h3 className="text-xl font-semibold text-white">{title}</h3>}
          {subtitle && <p className="mt-1 text-sm text-slate-200/80">{subtitle}</p>}
        </header>
      )}
      {children}
    </motion.section>
  );
}
