import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';
export const metadata: Metadata = { title: { default: 'Exact — Your everyday, elevated.', template: '%s | Exact' }, description: 'Your city. Your fare. Your way. Plan a trip, see your estimate, and find a driver with Exact.', applicationName: 'Exact Rider', robots: { index: true, follow: true } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffffff' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-NG"><body><a href="#main-content" className="fixed -top-20 left-4 z-[9999] rounded-full bg-black px-5 py-3 text-white focus:top-4">Skip to content</a><Providers>{children}</Providers></body></html>;
}
