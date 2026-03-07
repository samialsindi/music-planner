'use client';
import { useAppStore } from '@/lib/store';
import { detectClashes } from '@/lib/clash';
import moment from 'moment';
import { useState } from 'react';

export default function ClashFooter() {
  const { projects, events } = useAppStore();
  const clashes = detectClashes(projects, events);
  const [dismissed, setDismissed] = useState(false);

  if (clashes.length === 0 || dismissed) return null;

  const displayClashes = clashes.slice(0, 5);

  return (
    <div className="fixed bottom-4 left-[18rem] right-4 glass-panel border border-red-500/30 bg-red-950/40 p-4 shadow-[0_0_30px_rgba(239,68,68,0.1)] flex items-center justify-between z-50 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center animate-pulse shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
        </div>
        <div>
          <h4 className="text-red-400 font-bold text-lg">{clashes.length} {clashes.length === 1 ? 'Clash' : 'Clashes'}</h4>
          <p className="text-red-200/70 text-sm">Cross-project scheduling conflicts detected.</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto max-w-[50%] no-scrollbar snap-x">
        {displayClashes.map((c, idx) => (
          <div key={idx} className="shrink-0 bg-black/40 border border-red-500/20 p-2 rounded snap-start text-xs flex flex-col gap-1 min-w-[200px]">
            <div className="flex items-center justify-between text-gray-400 border-b border-white/5 pb-1">
               <span>{moment(c.event1.startTime).format('MMM Do')}</span>
               <span className="text-red-400 font-bold">{c.overlapMinutes}m overlap</span>
            </div>
            <div className="text-white font-medium truncate flex items-center gap-1.5 pt-1">
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: c.project1.color}} />
                {c.event1.title}
            </div>
            <div className="text-white font-medium truncate flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: c.project2.color}} />
                {c.event2.title}
            </div>
          </div>
        ))}
        {clashes.length > 5 && (
          <div className="shrink-0 bg-black/40 border border-red-500/20 p-2 rounded text-xs flex items-center justify-center min-w-[100px] text-red-300 font-bold">
            +{clashes.length - 5} more
          </div>
        )}
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="ml-4 shrink-0 text-gray-400 hover:text-white transition-colors"
        title="Dismiss"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
      </button>
    </div>
  );
}
