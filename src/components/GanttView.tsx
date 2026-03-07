import React, { useEffect, useRef, useState } from 'react';
import Gantt from 'frappe-gantt';
import { useAppStore } from '@/lib/store';

// A mock implementation to avoid errors in Frappe Gantt if we have no tasks
const mockTask = {
  id: 'mock-1',
  name: 'No events matching filters',
  start: new Date().toISOString().split('T')[0],
  end: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
  progress: 0,
  dependencies: '',
  custom_class: 'opacity-50',
};

export default function GanttView() {
  const ganttRef = useRef<HTMLDivElement>(null);
  const ganttInstance = useRef<any>(null);
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Day');

  const { events, projects, eventTypeFilters } = useAppStore();

  useEffect(() => {
    if (!ganttRef.current) return;

    // 1. Filter events based on active toggles AND approved status
    const activeEvents = events.filter((e) => {
      // Must be approved to show in Gantt
      if (e.status === 'pending') return false;

      // Event-level toggle
      if (!e.isToggled) return false;

      // Type-level toggle
      if (!eventTypeFilters[e.type]) return false;

      // Project-level toggle
      const project = projects.find((p) => p.id === e.projectId);
      if (!project || !project.isActive) return false;

      return true;
    });

    // 2. Format tasks for Frappe Gantt
    let tasks = activeEvents.map((e) => {
      const project = projects.find((p) => p.id === e.projectId);
      const colorClass = `gantt-color-${e.projectId}`;

      return {
        id: e.id,
        name: e.title,
        start: e.startTime.toISOString().split('T')[0],
        end: e.endTime.toISOString().split('T')[0],
        progress: 100,
        dependencies: '',
        custom_class: colorClass, // We'll inject CSS for these colors
      };
    });

    if (tasks.length === 0) {
      tasks = [mockTask];
    }

    // 3. Initialize or update Gantt
    if (!ganttInstance.current) {
      ganttInstance.current = new Gantt(ganttRef.current, tasks, {
        header_height: 50,
        column_width: 30,
        step: 24,
        view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
        bar_height: 30,
        bar_corner_radius: 6,
        arrow_curve: 5,
        padding: 18,
        view_mode: viewMode,
        date_format: 'YYYY-MM-DD',
        custom_popup_html: function(task: any) {
          if (task.id === 'mock-1') return '';
          const originalEvent = events.find(e => e.id === task.id);
          const timeString = originalEvent
            ? `${originalEvent.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${originalEvent.endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
            : '';

          return `
            <div class="p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-xl text-white z-50 min-w-[200px]">
              <div class="font-bold text-lg mb-1">${task.name}</div>
              <div class="text-gray-400 text-sm mb-2">${timeString}</div>
              ${originalEvent?.inferredInstrumentation ? `
                <div class="mt-2 pt-2 border-t border-gray-700 text-xs">
                  <div class="font-semibold text-purple-400 mb-1">Instrumentation Notes:</div>
                  <div class="text-gray-300">${originalEvent.inferredInstrumentation.notes}</div>
                  <div class="flex gap-2 mt-2">
                    <span class="px-2 py-1 rounded bg-gray-800 ${originalEvent.inferredInstrumentation.timpaniRequired ? 'text-emerald-400' : 'text-gray-500'}">Timpani</span>
                    <span class="px-2 py-1 rounded bg-gray-800 ${originalEvent.inferredInstrumentation.percussionRequired ? 'text-emerald-400' : 'text-gray-500'}">Percussion</span>
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }
      });
    } else {
      ganttInstance.current.refresh(tasks);
      ganttInstance.current.change_view_mode(viewMode);
    }
  }, [events, projects, eventTypeFilters, viewMode]);

  return (
    <div className="glass-panel p-6 flex flex-col h-full min-h-[400px]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h14"/></svg>
          Timeline View
        </h3>

        <div className="flex bg-gray-900/50 rounded-lg p-1 border border-white/5">
          {['Day', 'Week', 'Month'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === mode
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
      
      {/* Inject custom styles for project colors */}
      <style dangerouslySetInnerHTML={{__html: `
        ${projects.map(p => `
          .gantt-color-${p.id} .bar { fill: ${p.color} !important; opacity: 0.8; }
          .gantt-color-${p.id} .bar-progress { fill: ${p.color} !important; opacity: 0.9; filter: brightness(1.2); }
        `).join('\n')}
      `}} />

      <div className="flex-1 overflow-x-auto custom-scrollbar bg-black/20 rounded-xl border border-white/5 p-4">
        <div ref={ganttRef} className="w-full h-full" />
      </div>
    </div>
  );
}
