import Script from 'next/script';
import type { Metadata } from 'next';
import './globals.css';
import { AppErrorBoundary } from '../providers/error-boundary';

export const metadata: Metadata = {
  metadataBase: new URL('https://sara-via.netlify.app'),
  title: 'SARA VIA',
  description: 'Luxury travel marketplace powered by Pi Network and AI concierge.',
  alternates: {
    canonical: 'https://sara-via.netlify.app'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Script src="https://sdk.minepi.com/pi-sdk.js" strategy="beforeInteractive" />
        <AppErrorBoundary>{children}</AppErrorBoundary>
      </body>
    </html>
  );
}
