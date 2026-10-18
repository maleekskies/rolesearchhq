import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Instrument_Sans } from 'next/font/google';
import Sidebar from '@/components/Sidebar';

const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

// Runs before first paint so a saved theme choice never flashes the wrong colors.
const themeScript = "try{var t=localStorage.getItem('hb-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}";

export const metadata: Metadata = {
  metadataBase: new URL('https://huntboard-nu.vercel.app'),
  title: { default: 'Huntboard', template: '%s, Huntboard' },
  description: 'Your job search, reviewed before it sends.',
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg' },
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
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
