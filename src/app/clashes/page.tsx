'use client';
import { useAppStore } from '@/lib/store';
import { detectClashes } from '@/lib/clash';
import moment from 'moment';
import ProjectToggles from '@/components/ProjectToggles';

export default function ClashesPage() {
  const { projects, events, eventTypeFilters } = useAppStore();
  const clashes = detectClashes(projects, events, eventTypeFilters);

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full">
      <div className="flex-1 flex flex-col gap-8 min-w-0">
        <header className="glass-panel p-6">
          <h2 className="text-3xl font-bold tracking-tight heading-gradient">Clash Detection</h2>
          <p className="text-gray-400 mt-1">Review your active clashes.</p>
        </header>

        <div className="glass-panel p-6">
          {clashes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
              <p className="text-lg">No clashes detected!</p>
              <p className="text-sm mt-2">Your schedule is looking good.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {clashes.map((c, idx) => (
                <div key={idx} className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                     <span className="text-gray-300 font-mono text-sm">{moment(c.event1.startTime).format('dddd, MMMM Do YYYY')}</span>
                     <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{c.overlapMinutes}m Overlap</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: c.project1.color}} />
                        <span className="font-bold text-gray-200">{c.project1.name}</span>
                      </div>
                      <h4 className="text-lg font-medium text-white mb-1">{c.event1.title}</h4>
                      <p className="text-sm text-gray-400 font-mono">
                        {moment(c.event1.startTime).format('h:mm a')} - {moment(c.event1.endTime).format('h:mm a')}
                      </p>
                    </div>

                    <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: c.project2.color}} />
                        <span className="font-bold text-gray-200">{c.project2.name}</span>
                      </div>
                      <h4 className="text-lg font-medium text-white mb-1">{c.event2.title}</h4>
                      <p className="text-sm text-gray-400 font-mono">
                        {moment(c.event2.startTime).format('h:mm a')} - {moment(c.event2.endTime).format('h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-[400px] shrink-0">
        <ProjectToggles />
      </div>
    </div>
  );
}
