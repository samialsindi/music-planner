'use client';
import { useAppStore } from '@/lib/store';
import { useEffect, useRef, useState } from 'react';

// Using standard Frappe Gantt via dynamic import to avoid SSR issues
import Gantt from 'frappe-gantt';
import 'frappe-gantt/dist/frappe-gantt.css';
import moment from 'moment';

export default function GanttView() {
  const { events, projects, eventTypeFilters } = useAppStore();
  const activeEventsList = events.filter(e => e.status !== 'pending');
  const ganttRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);
  const [viewMode, setViewMode] = useState<'Month' | 'Year'>('Month');

  useEffect(() => {
    if (!ganttRef.current) return;

    // Filter to only events from TODAY onwards (ignoring past)
    const today = moment().startOf('day');

    // Group events logically per project to create continuous bars in Gannt
    const activeProjects = projects.filter(p => p.isActive);

    const tasks = activeProjects.map(project => {
      // Get ALL events for this project to accurately draw the project timespan
      const allProjectEvents = events.filter(
        e => e.projectId === project.id && e.isToggled
      );

      // Default fallback if no events exist at all
      let start = moment().format('YYYY-MM-DD');
      let end = moment().add(1, 'month').format('YYYY-MM-DD');

      if (allProjectEvents.length > 0) {
        // Sort chronologically
        allProjectEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        // The project "starts" at the first event and "ends" at the last event
        start = moment(allProjectEvents[0].startTime).format('YYYY-MM-DD');
        end = moment(allProjectEvents[allProjectEvents.length - 1].endTime).format('YYYY-MM-DD');
      }

      return {
        id: project.id,
        name: project.name,
        start,
        end,
        progress: 0,
        custom_class: `gantt-proj-${project.id}`, // We can target this in CSS for colors
      };
    });

    if (tasks.length === 0) return;

    if (chartInstance.current) {
        chartInstance.current.refresh(tasks);
        chartInstance.current.change_view_mode(viewMode);
    } else {
        chartInstance.current = new Gantt(ganttRef.current, tasks, {
          view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month', 'Year'],
          view_mode: viewMode,
          custom_popup_html: function(task: any) {
            return `
              <div class="glass-panel p-3 min-w-[150px]">
                <h4 class="font-bold text-white mb-1">${task.name}</h4>
                <p class="text-xs text-gray-300">${moment(task._start).format('MMM Do')} - ${moment(task._end).format('MMM Do YYYY')}</p>
              </div>
            `;
          }
        });
    }

  }, [events, projects, viewMode, eventTypeFilters]);

  return (
    <>
      <style jsx global>{`
        ${projects.map(p => `
          .gantt-proj-${p.id} .bar { fill: ${p.color} !important; opacity: 0.8; }
          .gantt-proj-${p.id} .bar-progress { fill: ${p.color} !important; opacity: 1; }
        `).join('')}
      `}</style>
      <div className="flex flex-col gap-4">

      <div className="flex justify-end gap-2 mb-2">
        <button
          onClick={() => setViewMode('Month')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${viewMode === 'Month' ? 'bg-purple-600 text-white' : 'glass-panel text-gray-400 hover:text-white'}`}
        >
          Month View
        </button>
        <button
          onClick={() => setViewMode('Year')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${viewMode === 'Year' ? 'bg-purple-600 text-white' : 'glass-panel text-gray-400 hover:text-white'}`}
        >
          Year View
        </button>
      </div>
      
      <div className="glass-panel p-6 overflow-x-auto custom-gantt-theme">
        <div ref={ganttRef} className="w-full"></div>
      </div>
    </div>
    </>
  );
}
