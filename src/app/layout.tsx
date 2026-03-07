import type { Metadata, Viewport } from 'next';
import './globals.css';
import Link from 'next/link';
import ClashFooter from '@/components/ClashFooter';

export const metadata: Metadata = {
  title: 'Music Planner | Vibecoding Edition',
  description: 'Premium musician scheduling and clash detection',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col md:flex-row pb-24 md:pb-0">
        <aside className="w-full md:w-64 glass-panel m-0 md:m-4 flex flex-row md:flex-col p-4 md:p-6 md:fixed md:h-[calc(100vh-2rem)] z-10 transition-all items-center md:items-start justify-between md:justify-start rounded-none md:rounded-2xl border-x-0 border-t-0 md:border">
          <h1 className="text-xl md:text-2xl font-bold heading-gradient mb-0 md:mb-8">Maestro</h1>
          
          <nav className="flex flex-row md:flex-col gap-2 md:gap-4 md:flex-1">
            <Link href="/" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 py-2 px-2 md:px-3 rounded-lg hover:bg-white/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              <span className="hidden md:inline">Calendar</span>
            </Link>
            <Link href="/gantt" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 py-2 px-2 md:px-3 rounded-lg hover:bg-white/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h7"/></svg>
              <span className="hidden md:inline">Gantt View</span>
            </Link>
            <Link href="/projects" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 py-2 px-2 md:px-3 rounded-lg hover:bg-white/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              <span className="hidden md:inline">Projects</span>
            </Link>
          </nav>

          <footer className="mt-auto text-xs text-gray-500 hidden md:block">
            Intelligent Clash Detection Active
          </footer>
        </aside>

        <main className="flex-1 md:ml-[calc(16rem+2rem)] p-4 md:p-8 relative flex flex-col min-h-screen">
          <div className="flex-1 pb-24">
            {children}
          </div>
          <ClashFooter />
        </main>
      </body>
    </html>
  );
}
