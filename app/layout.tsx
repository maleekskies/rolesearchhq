import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Geologica, Hanken_Grotesk } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Sidebar from '@/components/Sidebar';
import MobileHeader from '@/components/MobileHeader';

const display = Geologica({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://rolesearchhq.vercel.app'),
  applicationName: 'RoleSearchHQ',
  title: { default: 'RoleSearchHQ', template: '%s · RoleSearchHQ' },
  description: 'Your role landscape, mapped. Roles scored, kits drafted, and nothing sends until you approve it.',
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg', shortcut: '/icon.svg' },
  openGraph: {
    type: 'website',
    siteName: 'RoleSearchHQ',
    title: 'RoleSearchHQ',
    description: 'Your role landscape, mapped. Roles scored, kits drafted, and nothing sends until you approve it.',
    url: 'https://rolesearchhq.vercel.app',
  },
  twitter: {
    card: 'summary',
    title: 'RoleSearchHQ',
    description: 'Your role landscape, mapped. Roles scored, kits drafted, and nothing sends until you approve it.',
  },
  appleWebApp: {
    capable: true,
    title: 'RoleSearchHQ',
    statusBarStyle: 'black-translucent',
  },
  category: 'productivity',
};

export const viewport: Viewport = {
  themeColor: '#0E2A1F',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-bg font-sans text-text">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="min-w-0 flex-1">
            <MobileHeader />
            {children}
          </main>
        </div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
