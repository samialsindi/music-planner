import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import ClashFooter from '@/components/ClashFooter';

export const metadata: Metadata = {
  title: 'Music Planner | Vibecoding Edition',
  description: 'Premium musician scheduling and clash detection',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { Toaster } from 'react-hot-toast';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex">
        <aside className="hidden lg:flex w-64 glass-panel m-4 flex-col p-6 fixed h-[calc(100vh-2rem)] z-50 transition-all">
          <h1 className="text-2xl font-bold heading-gradient mb-8">Maestro</h1>
          
          <nav className="flex flex-col gap-4 flex-1">
            <Link href="/" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              Calendar
            </Link>
            <Link href="/" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h7"/></svg>
              Gantt View
            </Link>
            <Link href="/" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              Projects
            </Link>
            <Link href="/clashes" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Clashes
            </Link>
          </nav>

          <footer className="mt-auto text-xs text-gray-500">
            Intelligent Clash Detection Active
          </footer>
        </aside>

        <main className="flex-1 lg:ml-80 p-4 lg:p-8 relative flex flex-col min-h-screen min-w-0">
          <div className="flex-1 pb-24">
            {children}
          </div>
          <ClashFooter />
        </main>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
