import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Instrument_Sans } from 'next/font/google';
import Sidebar from '@/components/Sidebar';
import MobileHeader from '@/components/MobileHeader';

const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

// Runs before first paint so a saved theme choice never flashes the wrong colors.
// The legacy theme key is read once and moved to the RoleSearchHQ key.
const themeScript =
  "try{var k='rolesearchhq-theme',o='hb-theme',t=localStorage.getItem(k)||localStorage.getItem(o);if(t){document.documentElement.dataset.theme=t;if(!localStorage.getItem(k)){localStorage.setItem(k,t);localStorage.removeItem(o)}}}catch(e){}";

export const metadata: Metadata = {
  metadataBase: new URL('https://rolesearchhq.vercel.app'),
  applicationName: 'RoleSearchHQ',
  title: { default: 'RoleSearchHQ', template: '%s · RoleSearchHQ' },
  description: 'Your job search, reviewed before it sends.',
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg', shortcut: '/icon.svg' },
  openGraph: {
    type: 'website',
    siteName: 'RoleSearchHQ',
    title: 'RoleSearchHQ',
    description: 'Your job search, reviewed before it sends.',
    url: 'https://rolesearchhq.vercel.app',
  },
  twitter: {
    card: 'summary',
    title: 'RoleSearchHQ',
    description: 'Your job search, reviewed before it sends.',
  },
  appleWebApp: {
    capable: true,
    title: 'RoleSearchHQ',
    statusBarStyle: 'default',
  },
  category: 'productivity',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F6F8' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0E17' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-bg text-text font-sans min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0">
            <MobileHeader />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
