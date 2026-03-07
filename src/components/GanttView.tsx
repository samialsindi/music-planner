'use client';
import { useAppStore } from '@/lib/store';
import { useEffect, useRef, useState } from 'react';

// Using standard Frappe Gantt via dynamic import to avoid SSR issues
import Gantt from 'frappe-gantt';
import 'frappe-gantt/dist/frappe-gantt.css';
import moment from 'moment';

export default function GanttView() {
  const { events, projects } = useAppStore();
  const ganttRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);
  const [viewMode, setViewMode] = useState<'Month' | 'Year' | 'Week' | 'Day'>('Week');

  useEffect(() => {
    if (!ganttRef.current) return;

    // Filter to active projects
    const activeProjectIds = new Set(projects.filter(p => p.isActive).map(p => p.id));
    
    // Get all events that are toggled on AND belong to an active project
    const activeEvents = events.filter(e => e.isToggled && activeProjectIds.has(e.projectId));

    // Map each individual event to a task for the Gantt chart
    const tasks = activeEvents.map(event => {
      const project = projects.find(p => p.id === event.projectId);

      // Ensure there's a minimum duration for Gantt rendering, frappe-gantt prefers full days usually,
      // but we will pass precise timestamps.
      return {
        id: event.id,
        name: `${project?.name.substring(0, 15)}... : ${event.title}`,
        start: moment(event.startTime).format('YYYY-MM-DD HH:mm'),
        end: moment(event.endTime).format('YYYY-MM-DD HH:mm'),
        progress: 0,
        custom_class: `gantt-proj-${event.projectId}`,
      };
    });

    if (tasks.length === 0) {
      if (chartInstance.current) {
         // Clear the chart if there are no tasks
         ganttRef.current.innerHTML = '';
         chartInstance.current = null;
      }
      return;
    }

    // Check if we need to completely recreate the chart (Frappe Gantt doesn't handle full task list replacements well with `refresh`)
    ganttRef.current.innerHTML = '';

    chartInstance.current = new Gantt(ganttRef.current, tasks, {
      view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month', 'Year'],
      view_mode: viewMode,
      custom_popup_html: function(task: any) {
        return `
          <div class="glass-panel p-3 min-w-[150px] z-50">
            <h4 class="font-bold text-white mb-1">${task.name}</h4>
            <p class="text-xs text-gray-300">${moment(task._start).format('MMM Do, h:mm a')} - ${moment(task._end).format('h:mm a')}</p>
          </div>
        `;
      }
    });

  }, [events, projects, viewMode]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2 mb-2">
        <button 
          onClick={() => setViewMode('Day')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${viewMode === 'Day' ? 'bg-purple-600 text-white' : 'glass-panel text-gray-400 hover:text-white'}`}
        >
          Day
        </button>
        <button 
          onClick={() => setViewMode('Week')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${viewMode === 'Week' ? 'bg-purple-600 text-white' : 'glass-panel text-gray-400 hover:text-white'}`}
        >
          Week
        </button>
        <button
          onClick={() => setViewMode('Month')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${viewMode === 'Month' ? 'bg-purple-600 text-white' : 'glass-panel text-gray-400 hover:text-white'}`}
        >
          Month
        </button>
      </div>
      
      <div className="glass-panel p-6 overflow-x-auto custom-gantt-theme relative min-h-[300px]">
        {events.filter(e => e.isToggled && projects.find(p => p.id === e.projectId)?.isActive).length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            No active events to display
          </div>
        ) : (
          <div ref={ganttRef} className="w-full"></div>
        )}
      </div>
    </div>
  );
}
