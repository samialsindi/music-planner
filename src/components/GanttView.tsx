'use client';
import { useLongPress } from '@/hooks/useLongPress';
import { useAppStore } from '@/lib/store';
import { useEffect, useRef, useState } from 'react';

import Gantt from 'frappe-gantt';
import 'frappe-gantt/dist/frappe-gantt.css';
import moment from 'moment';
import { ORCH_DEONTOLOGIES, ORCH_KEYWORDS, detectOrchestra } from '@/lib/deontologies';

export default function GanttView() {
  const { events, projects, eventTypeFilters, settings, setCalendarDate, setCalendarView, highlightedEventId, setHighlightedEventId } = useAppStore();
  const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);
  const ganttRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Week');

  // Sync scrolling between sidebar and gantt
  const handleScroll = () => {
    if (scrollWrapperRef.current && sidebarRef.current) {
      sidebarRef.current.scrollTop = scrollWrapperRef.current.scrollTop;
    }
    
    // SVG sticky header logic
    const svg = ganttRef.current?.querySelector('svg');
    if (svg && scrollWrapperRef.current) {
        const headerGroup = svg.querySelector('.sticky-header-group') as SVGGElement;
        if (headerGroup) {
            headerGroup.setAttribute('transform', `translate(0, ${scrollWrapperRef.current.scrollTop})`);
        }
    }
  };

  useEffect(() => {
    if (!ganttRef.current) return;

    const today = moment().startOf('day');
    const activeProjects = projects.filter(p => !settings.hiddenProjectIds.includes(p.id));

    const tasks = activeProjects.map(project => {
      const allProjectEvents = events.filter(e => e.projectId === project.id && !settings.hiddenEventIds.includes(e.id));
      if (allProjectEvents.length === 0) return null;
      
      allProjectEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      const actualStart = moment(allProjectEvents[0].startTime);
      const start = (actualStart.isBefore(today) ? today : actualStart).format('YYYY-MM-DD');
      const end = moment(allProjectEvents[allProjectEvents.length - 1].endTime).format('YYYY-MM-DD');

      return {
        id: project.id,
        name: project.name,
        start,
        end,
        progress: 0,
        custom_class: `gantt-proj-${project.id}`,
        allEvents: allProjectEvents
      };
    }).filter(Boolean) as any[];

    // Ghost task to ensure full width
    tasks.push({
      id: 'ghost-boundary',
      name: '',
      start: moment().subtract(1, 'month').format('YYYY-MM-DD'),
      end: moment().add(2, 'year').format('YYYY-MM-DD'),
      progress: 0,
      custom_class: 'hidden-ghost-task'
    });

    if (tasks.length <= 1) {
      ganttRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">No active projects</div>';
      return;
    }

    chartInstance.current = new Gantt(ganttRef.current, tasks, {
      view_mode: viewMode,
      header_height: 50,
      column_width: 30,
      step: 24,
      bar_height: 25,
      bar_corner_radius: 4,
      arrow_curve: 5,
      padding: 18,
      on_click: (task: any) => {
        const projTasks = tasks.find(t => t.id === task.id);
        if (projTasks && projTasks.allEvents.length > 0) {
           const firstReh = projTasks.allEvents.find((e: any) => e.type === 'rehearsal') || projTasks.allEvents[0];
           setCalendarDate(new Date(firstReh.startTime));
           setCalendarView('month');
           setHighlightedEventId(firstReh.id);
           
           setTimeout(() => {
             const el = document.querySelector('.rbc-calendar');
             if (el) el.scrollIntoView({ behavior: 'smooth' });
             // Clear highlight after 3 seconds
             setTimeout(() => setHighlightedEventId(null), 3000);
           }, 100);
        }
      }
    });

    // Custom UI injection for stripes and sticky header
    setTimeout(() => {
        const svg = ganttRef.current?.querySelector('svg');
        if (!svg) return;

        // Create Sticky Header Group
        let stickyHeader = svg.querySelector('.sticky-header-group');
        if (stickyHeader) stickyHeader.remove();
        
        stickyHeader = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        stickyHeader.setAttribute('class', 'sticky-header-group');
        
        const headerBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        headerBg.setAttribute('width', '100%');
        headerBg.setAttribute('height', '50');
        headerBg.setAttribute('fill', '#111827');
        stickyHeader.appendChild(headerBg);

        const headerItems = svg.querySelectorAll('.grid-header, .upper-text, .lower-text, .tick');
        headerItems.forEach(item => {
            const cloned = item.cloneNode(true) as SVGElement;
            stickyHeader?.appendChild(cloned);
        });
        
        svg.appendChild(stickyHeader);
        
        // Stripes logic... (simplified here for brevity, keeping existing logic stable)
        const barWrappers = svg.querySelectorAll('.bar-wrapper');
        barWrappers.forEach(wrapper => {
           const id = wrapper.getAttribute('data-id');
           const task = tasks.find(t => t.id === id);
           if (!task) return;
           
           const bar = wrapper.querySelector('.bar') as SVGRectElement;
           if (!bar) return;
           
           const bX = parseFloat(bar.getAttribute('x') || '0');
           const bW = parseFloat(bar.getAttribute('width') || '0');
           const bY = parseFloat(bar.getAttribute('y') || '0');
           const bH = parseFloat(bar.getAttribute('height') || '0');
           
           const tStart = moment(task.start).valueOf();
           const tEnd = moment(task.end).valueOf();
           const tDur = tEnd - tStart;
           
           task.allEvents.forEach((e: any) => {
              const eS = moment(e.startTime).valueOf();
              const eE = moment(e.endTime).valueOf();
              if (eE < tStart || eS > tEnd) return;
              
              const startOff = Math.max(0, (eS - tStart) / tDur);
              const durRatio = (eE - Math.max(eS, tStart)) / tDur;
              
              const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              r.setAttribute('x', (bX + startOff * bW).toString());
              r.setAttribute('y', bY.toString());
              r.setAttribute('width', Math.max(2, durRatio * bW).toString());
              r.setAttribute('height', bH.toString());
              r.setAttribute('fill', 'rgba(255,255,255,0.3)');
              r.setAttribute('rx', '2');
              wrapper.appendChild(r);
           });
        });

        // Initial scroll position
        const todayLine = svg.querySelector('.today-highlight');
        if (todayLine && scrollWrapperRef.current) {
            const x = parseFloat(todayLine.getAttribute('x') || '0');
            scrollWrapperRef.current.scrollLeft = x - 100;
        }
    }, 100);

  }, [events, projects, viewMode, settings.hiddenProjectIds, settings.hiddenEventIds]);

  const activeProjects = projects.filter(p => !settings.hiddenProjectIds.includes(p.id) && events.some(e => e.projectId === p.id));

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex justify-end gap-2 mb-4">
        {['Day', 'Week', 'Month', 'Year'].map(m => (
          <button key={m} onClick={() => setViewMode(m as any)} 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === m ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'glass-panel text-gray-400 hover:text-white'}`}>
            {m}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden glass-panel border-white/5 relative">
        {/* Sticky Sidebar (Freeze Pane) */}
        <div className="w-48 bg-gray-900/80 backdrop-blur-md border-r border-white/10 overflow-hidden flex flex-col z-20">
          <div className="h-[50px] border-b border-white/10 flex items-center px-4 bg-gray-950/50 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Project</span>
          </div>
          <div ref={sidebarRef} className="flex-1 overflow-hidden">
            {activeProjects.map((p, idx) => {
              const displayName = detectOrchestra(p.name) || p.name;
              return (
                <div key={p.id} className="h-[43px] flex items-center px-4 border-b border-white/5" style={{ height: '43px' }}>
                  <span className="text-xs font-semibold text-gray-200 truncate">{displayName}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gantt Area */}
        <div ref={scrollWrapperRef} onScroll={handleScroll} className="flex-1 overflow-auto gantt-scroll-wrapper custom-gantt-theme bg-gray-950/20">
          <div ref={ganttRef} className="w-full h-full min-w-max"></div>
        </div>
      </div>

      <style jsx global>{`
        .gantt .bar-label { display: none !important; } /* Hide labels since we have sidebar */
        .gantt-container { height: 100% !important; border: none !important; }
        .gantt .grid-header { fill: #111827 !important; }
        .gantt .upper-text { fill: #9ca3af !important; font-weight: 600 !important; font-size: 10px !important; }
        .gantt .lower-text { fill: #6b7280 !important; font-size: 9px !important; }
        .gantt .grid-row { fill: transparent !important; stroke: rgba(255,255,255,0.03) !important; }
        .gantt .today-highlight { fill: rgba(168, 85, 247, 0.1) !important; }
        .hidden-ghost-task { opacity: 0; pointer-events: none; }
        ${projects.map(p => `[data-id="${p.id}"] .bar { fill: ${p.color} !important; opacity: 1 !important; }`).join('\n')}
        .gantt .bar-progress { fill: rgba(255,255,255,0.1) !important; }
      `}</style>
    </div>
  );
}
