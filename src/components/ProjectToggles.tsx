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

  const { projects, events, toggleProject, toggleEvent, eventTypeFilters, toggleEventType } = useAppStore();
  const clashes = detectClashes(projects, events, eventTypeFilters);
  const clashingEventIds = new Set(
    clashes.flatMap(c => [c.event1.id, c.event2.id])
  );

  return (
    <div className="glass-panel p-6 mt-6 max-h-[600px] overflow-y-auto">
      <h3 className="text-xl font-bold heading-gradient mb-4">Projects / Groups Control</h3>
      <p className="text-sm text-gray-400 mb-6">
        Toggle entire projects or granular rehearsals to see how it affects your clash schedule down to the minute.
      </p>


      <div className="mb-6">
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
          const projectEvents = events
            .filter((e) => e.projectId === project.id && eventTypeFilters[e.type as keyof typeof eventTypeFilters])
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

          return (
            <div key={project.id} className="p-4 rounded-xl relative overflow-hidden bg-black/20 border border-white/5">
              {/* Colored Side Bar */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1.5" 
                style={{ backgroundColor: project.color }} 
              />
              
              <div className="flex items-center justify-between mb-4 pl-4">
                <h4 className="font-bold text-lg text-white">{project.name}</h4>
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

              {/* Sub-toggles for events if Project is ON */}
              {project.isActive && (
                <div className="flex flex-col gap-2 pl-4">
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
    </div>
  );
}
