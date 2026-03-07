'use client';
import { useAppStore } from '@/lib/store';
import { detectClashes } from '@/lib/clash';
import moment from 'moment';

export default function ClashFooter() {
  const { projects, events } = useAppStore();
  const clashes = detectClashes(projects, events);

  if (clashes.length === 0) return null;

  return (
    <div className="fixed bottom-0 md:bottom-4 left-0 md:left-[18rem] right-0 md:right-4 glass-panel md:border border-red-500/30 bg-red-950/90 md:bg-red-950/40 p-4 shadow-[0_0_30px_rgba(239,68,68,0.1)] flex items-center justify-between z-50 animate-in slide-in-from-bottom-5 md:rounded-2xl rounded-none">
      <div className="flex items-center gap-4 w-full md:w-auto overflow-hidden">
        <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-5 md:h-5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-red-400 font-bold text-sm md:text-lg truncate">Warning: {clashes.length} {clashes.length === 1 ? 'Clash' : 'Clashes'}</h4>
          <p className="text-red-200/70 text-xs hidden md:block">Review your toggled schedule. Conflicts highlighted in red.</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto max-w-[60%] md:max-w-[50%] no-scrollbar snap-x ml-4">
        {clashes.map((c, idx) => (
          <div key={idx} className="shrink-0 bg-black/40 border border-red-500/20 p-2 rounded snap-start text-xs flex flex-col gap-1 w-[160px] md:min-w-[200px]">
            <div className="flex items-center justify-between text-gray-400 border-b border-white/5 pb-1">
               <span>{moment(c.event1.startTime).format('MMM Do')}</span>
               <span className="text-red-400 font-bold">{c.overlapMinutes}m</span>
            </div>
            <div className="text-white font-medium truncate flex items-center gap-1.5 pt-1">
                <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: c.project1.color}} />
                <span className="truncate">{c.event1.title}</span>
            </div>
            <div className="text-white font-medium truncate flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: c.project2.color}} />
                <span className="truncate">{c.event2.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
