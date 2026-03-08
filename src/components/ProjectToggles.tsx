'use client';

import { useAppStore } from '@/lib/store';
import { detectClashes } from '@/lib/clash';
import moment from 'moment';

import { useState } from 'react';

export default function ProjectToggles() {

  const [classifyingProjectId, setClassifyingProjectId] = useState<string | null>(null);

  const classifyProject = async (projectId: string) => {
    setClassifyingProjectId(projectId);
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Classified ${data.count} events successfully.`);
        window.location.reload();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Failed to classify events.');
    } finally {
      setClassifyingProjectId(null);
    }
  };

  const handleExportiCal = async () => {
    try {
      const res = await fetch('/api/calendar/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'music_planner.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export calendar.');
      console.error(err);
    }
  };

  const handleGcalSync = async () => {
    try {
      const res = await fetch('/api/sync');
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `Sync complete. Synced ${data.count || 0} events.`);
      } else {
        alert(data.message || data.instructions || 'Sync not available yet.');
      }
    } catch (err) {
      alert('Failed to sync to Google Calendar.');
      console.error(err);
    }
  };

  const { projects, events, toggleProject, toggleEvent, eventTypeFilters, toggleEventType } = useAppStore();
  const clashes = detectClashes(projects, events, eventTypeFilters);
  const clashingEventIds = new Set(
    clashes.flatMap(c => [c.event1.id, c.event2.id])
  );

  return (
    <div className="glass-panel p-6 pl-8 mt-6 max-h-[600px] overflow-y-auto">
      <h3 className="text-xl font-bold heading-gradient mb-4">Projects / Groups Control</h3>
      <p className="text-sm text-gray-400 mb-6">
        Toggle entire projects or granular rehearsals to see how it affects your clash schedule down to the minute.
      </p>


      <div className="mb-6 pl-2">
        <h4 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider">Event Types</h4>
        <div className="flex flex-wrap gap-2">
          {(['rehearsal', 'concert', 'personal', 'other'] as const).map(type => (
            <button
              key={type}
              onClick={() => toggleEventType(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                eventTypeFilters[type]
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/50'
                  : 'bg-gray-800 text-gray-500 border border-gray-700'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {projects.map((project) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const projectEvents = events
            .filter((e) => e.projectId === project.id && eventTypeFilters[e.type as keyof typeof eventTypeFilters] && e.startTime >= today)
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

          return (
            <div key={project.id} className="p-4 rounded-xl relative overflow-hidden bg-black/20 border border-white/5">
              {/* Colored Side Bar */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1.5" 
                style={{ backgroundColor: project.color }} 
              />
              
              <div className="flex items-center justify-between mb-4 pl-8 pr-2">
                <h4 className="font-bold text-lg text-white pr-4">{project.name}</h4>
                <div className="flex shrink-0">
                  <button
                    onClick={() => classifyProject(project.id)}
                    disabled={classifyingProjectId === project.id}
                    className="mr-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-indigo-600/20 text-indigo-400 border border-indigo-500/50 hover:bg-indigo-600/40"
                  >
                    {classifyingProjectId === project.id ? 'AI...' : 'AI Classify'}
                  </button>
                  <button
                    onClick={() => toggleProject(project.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      project.isActive
                        ? 'bg-purple-600/20 text-purple-400 border border-purple-500/50'
                        : 'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}
                  >
                    {project.isActive ? 'ACTIVE (ON)' : 'MUTED (OFF)'}
                  </button>
                </div>
              </div>

              {/* Sub-toggles for events if Project is ON */}
              {project.isActive && (
                <div className="flex flex-col gap-2 pl-8 pr-2">
                  {projectEvents.map((e) => {
                    const isClashing = e.isToggled && clashingEventIds.has(e.id);
                    
                    return (
                      <div 
                        key={e.id} 
                        className={`flex items-start justify-between p-3 rounded-lg transition-colors border ${
                          isClashing 
                            ? 'bg-red-500/10 border-red-500/50' 
                            : 'bg-white/5 border-transparent hover:bg-white/10'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-200">{e.title}</span>
                            {isClashing && (
                              <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 bg-red-400/10 px-2 py-0.5 rounded-sm">
                                Clash!
                              </span>
                            )}
                          </div>
                          
                          <div className="text-xs text-gray-400 font-mono">
                            {moment(e.startTime).format('MMM Do, h:mm a')} - {moment(e.endTime).format('h:mm a')}
                          </div>
                          
                          {/* Instrumentation LLM Inference Alert */}
                          {e.inferredInstrumentation && (
                            <div className="mt-2 text-xs bg-black/30 p-2 rounded border border-white/5 text-gray-400 flex flex-col gap-1">
                              <div><span className="text-purple-400">⚡ AI Inference:</span> {e.inferredInstrumentation.notes}</div>
                              <div className="flex gap-3">
                                <span className={e.inferredInstrumentation.timpaniRequired ? 'text-gray-300' : 'text-gray-500 line-through'}>
                                  Timpani
                                </span>
                                <span className={e.inferredInstrumentation.percussionRequired ? 'text-gray-300' : 'text-gray-500 line-through'}>
                                  Percussion
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => toggleEvent(e.id)}
                          className={`ml-4 mt-1 w-10 h-5 rounded-full relative transition-colors ${
                            e.isToggled ? 'bg-purple-600' : 'bg-gray-700'
                          }`}
                        >
                          <div className={`absolute top-0.5 bottom-0.5 w-4 bg-white rounded-full transition-all shadow-md ${
                            e.isToggled ? 'right-0.5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hidden Events Section (Undo functionality) */}
      {events.some(e => !e.isToggled) && (
        <div className="mt-4 mb-6 pt-4 border-t border-white/10">
          <h4 className="text-sm font-bold text-gray-400 mb-3 flex items-center justify-between">
            Hidden Events
            <span className="bg-gray-800 text-xs px-2 py-0.5 rounded-full">{events.filter(e => !e.isToggled).length}</span>
          </h4>
          <div className="flex flex-col gap-2">
            {events.filter(e => !e.isToggled).map(e => (
              <div key={e.id} className="flex items-center justify-between p-2 rounded bg-gray-900/50 border border-gray-800">
                <div className="truncate pr-2">
                  <div className="text-xs font-medium text-gray-300 truncate">{e.title}</div>
                  <div className="text-[10px] text-gray-500">{moment(e.startTime).format('MMM Do, h:mm a')}</div>
                </div>
                <button
                  onClick={() => toggleEvent(e.id)}
                  className="shrink-0 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors border border-gray-700 flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                  Undo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings & Export */}
      <div className="glass-panel p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Settings & Export
        </h3>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleExportiCal}
            className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors text-sm font-medium flex items-center justify-between"
          >
            Download .ics Calendar
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          </button>

          <button
            onClick={handleGcalSync}
            className="w-full text-left px-4 py-3 bg-blue-900/40 hover:bg-blue-800/60 border border-blue-500/20 text-blue-100 rounded-xl transition-colors text-sm font-medium flex items-center justify-between"
          >
            Direct Sync to Google Cal
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.27l-3.26-1.5M2 22l10-10"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
