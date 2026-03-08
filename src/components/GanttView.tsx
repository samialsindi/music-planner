'use client';
import { useAppStore } from '@/lib/store';
import { useEffect, useRef, useState } from 'react';

// Using standard Frappe Gantt via dynamic import to avoid SSR issues
import Gantt from 'frappe-gantt';
import 'frappe-gantt/dist/frappe-gantt.css';
import moment from 'moment';

export default function GanttView() {
  const { events, projects, eventTypeFilters, toggleProject } = useAppStore();
  const activeEventsList = events.filter(e => e.status !== 'pending');
  const ganttRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Month');

  // Compute intervals for the SVG gradients
  const activeProjects = projects.filter(p => p.isActive);

  useEffect(() => {
    if (!ganttRef.current) return;

    // Filter to only events from TODAY onwards (ignoring past)
    const today = moment().startOf('day');

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
        // To make the bar look good, padding by a small margin isn't strictly necessary but Frappe Gantt does better with discrete days
        start = moment(allProjectEvents[0].startTime).format('YYYY-MM-DD');
        end = moment(allProjectEvents[allProjectEvents.length - 1].endTime).format('YYYY-MM-DD');
      }

      return {
        id: project.id,
        name: project.name,
        start,
        end,
        progress: 100, // force progress to 100 to occupy full width if Frappe uses it
        custom_class: `gantt-proj-${project.id}`, // We can target this in CSS for colors
      };
    }).filter(t => t !== null) as any[];

    // Sort top to bottom chronologically
    tasks.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    if (tasks.length === 0) {
      if (ganttRef.current) ganttRef.current.innerHTML = '';
      chartInstance.current = null;
      return;
    }

    if (chartInstance.current) {
        chartInstance.current.refresh(tasks);
        chartInstance.current.change_view_mode(viewMode);
    } else {
        chartInstance.current = new Gantt(ganttRef.current, tasks, {
          view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month', 'Year'],
          view_mode: viewMode,
          readonly: true, // Attempt to set readonly if fork supports it
          on_click: (task: any) => {
            // Click to hide project
            toggleProject(task.id);
            
            // Show undo toast
            import('react-hot-toast').then(({ toast }) => {
              toast.success(`Hidden "${task.name}"`, {
                style: {
                  background: '#1f2937', // glass panel dark
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)',
                },
                iconTheme: { primary: '#10b981', secondary: '#1f2937' },
                action: {
                  label: 'Undo',
                  onClick: () => toggleProject(task.id),
                },
              } as any);
            });
          },
          on_date_change: (task: any, start: any, end: any) => {
             // Immediately snap back if they try to drag it, since we don't want them editing events from the Gantt chart summary level
             if (chartInstance.current) chartInstance.current.refresh(tasks);
          },
          on_progress_change: (task: any, progress: any) => {
             // Snap back
             if (chartInstance.current) chartInstance.current.refresh(tasks);
          },
          custom_popup_html: function(task: any) {
            return `
              <div class="glass-panel p-3 min-w-[150px]">
                <h4 class="font-bold text-white mb-1">${task.name}</h4>
                <p class="text-xs text-gray-300">Spans: ${moment(task._start).format('MMM Do')} - ${moment(task._end).format('MMM Do YYYY')}</p>
              </div>
            `;
          }
        });
    }

  }, [events, projects, viewMode, eventTypeFilters]);

  // Generate SVG Gradients for Stripes
  const renderGradients = () => {
    return activeProjects.map(project => {
      const pEvents = events.filter(e => e.projectId === project.id && e.isToggled);
      if (pEvents.length === 0) return null;
      
      pEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      const pStart = new Date(pEvents[0].startTime).getTime();
      const pEnd = new Date(pEvents[pEvents.length - 1].endTime).getTime();
      const duration = pEnd - pStart || 1;

      // Merge overlapping intervals
      const intervals = pEvents.map(e => ({
        start: new Date(e.startTime).getTime(),
        // minimum stripe width of 24 hours to ensure visibility on large timescales
        end: Math.max(new Date(e.endTime).getTime(), new Date(e.startTime).getTime() + 24 * 60 * 60 * 1000) 
      })).sort((a, b) => a.start - b.start);

      const merged = [];
      if (intervals.length > 0) {
        let current = intervals[0];
        for (let i = 1; i < intervals.length; i++) {
           if (intervals[i].start <= current.end) {
              current.end = Math.max(current.end, intervals[i].end);
           } else {
              merged.push(current);
              current = intervals[i];
           }
        }
        merged.push(current);
      }

      const stops = [];
      stops.push(<stop key="start" offset="0%" stopColor={project.color} stopOpacity={0.2} />);

      merged.forEach((m, idx) => {
          const startPct = Math.max(0, Math.min(100, ((m.start - pStart) / duration) * 100));
          const endPct = Math.max(0, Math.min(100, ((m.end - pStart) / duration) * 100));

          stops.push(
            <stop key={`m-${idx}-1`} offset={`${startPct}%`} stopColor={project.color} stopOpacity={0.2} />,
            <stop key={`m-${idx}-2`} offset={`${startPct}%`} stopColor={project.color} stopOpacity={1} />,
            <stop key={`m-${idx}-3`} offset={`${endPct}%`} stopColor={project.color} stopOpacity={1} />,
            <stop key={`m-${idx}-4`} offset={`${endPct}%`} stopColor={project.color} stopOpacity={0.2} />
          );
      });

      stops.push(<stop key="end" offset="100%" stopColor={project.color} stopOpacity={0.2} />);

      return (
        <linearGradient key={project.id} id={`grad-${project.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          {stops}
        </linearGradient>
      );
    });
  };

  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          {renderGradients()}
        </defs>
      </svg>
      <style jsx global>{`
        ${projects.map(p => `
          .bar-wrapper.gantt-proj-${p.id} .bar { fill: url(#grad-${p.id}) !important; opacity: 1 !important;  stroke: ${p.color}; stroke-width: 1px; }
          .bar-wrapper.gantt-proj-${p.id} .bar-progress { fill: transparent !important; }
        `).join('')}
        
        .gantt .handle-group { 
           display: none !important; 
        }
      `}</style>
      <div className="flex flex-col gap-4">

      <div className="flex justify-end gap-2 mb-2 flex-wrap">
        {['Day', 'Week', 'Month', 'Year'].map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode as any)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${viewMode === mode ? 'bg-purple-600 text-white' : 'glass-panel text-gray-400 hover:text-white'}`}
          >
            {mode} View
          </button>
        ))}
      </div>
      
      <div className="glass-panel p-6 overflow-x-auto custom-gantt-theme">
        <div ref={ganttRef} className="w-full"></div>
      </div>
    </div>
    </>
  );
}
