'use client';
import { useAppStore } from '@/lib/store';
import moment from 'moment';
import ProjectToggles from '@/components/ProjectToggles';
import { supabase } from '@/lib/supabase';

export default function DeclinedPage() {
  const { events, projects, updateEvent } = useAppStore();
  const declinedEvents = events.filter(e => e && e.isDeclined);

  const handleUndecline = async (eventId: string) => {
    // Optimistic UI update
    updateEvent({ id: eventId, isDeclined: false } as any);

    // Persist to Supabase
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_declined: false })
        .eq('id', eventId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to undecline event:', error);
      // Revert if error
      updateEvent({ id: eventId, isDeclined: true } as any);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full">
      <div className="flex-1 flex flex-col gap-8 min-w-0">
        <header className="glass-panel p-6">
          <h2 className="text-3xl font-bold tracking-tight heading-gradient">Declined Events</h2>
          <p className="text-gray-400 mt-1">Review events you have declined to attend.</p>
        </header>

        <div className="glass-panel p-6">
          {declinedEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-gray-500"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <p className="text-lg">No declined events!</p>
              <p className="text-sm mt-2">You are open to all scheduled events.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {declinedEvents.map((event) => {
                const project = projects.find(p => p && p.id === event.projectId);
                const projectColor = project ? project.color : '#888';
                const projectName = project ? project.name : 'Unknown Project';

                return (
                  <div key={event.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:bg-white/10">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: projectColor}} />
                        <span className="font-bold text-gray-200 text-sm">{projectName}</span>
                        <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs font-mono uppercase border border-gray-700">{event.type}</span>
                      </div>
                      <h4 className="text-lg font-medium text-white line-through text-gray-400 decoration-gray-500">{event.title}</h4>
                      <div className="text-sm text-gray-400 font-mono flex gap-3">
                         <span>{moment(event.startTime).format('ddd, MMM Do YYYY')}</span>
                         <span>{moment(event.startTime).format('h:mm a')} - {moment(event.endTime).format('h:mm a')}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleUndecline(event.id)}
                      className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg text-sm font-medium transition-colors border border-indigo-500/30 whitespace-nowrap"
                    >
                      Undecline
                    </button>
                  </div>
                );
              })}
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
