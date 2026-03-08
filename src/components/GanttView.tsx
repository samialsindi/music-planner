'use client';
import { useAppStore } from '@/lib/store';
import { useEffect, useRef, useState } from 'react';

import Gantt from 'frappe-gantt';
import 'frappe-gantt/dist/frappe-gantt.css';
import moment from 'moment';
import { detectClashes } from '@/lib/clash';

export default function GanttView() {
  const { events, projects, eventTypeFilters } = useAppStore();
  const activeEventsList = events.filter(e => e.status !== 'pending');
  const ganttRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Week');

  useEffect(() => {
    if (!ganttRef.current) return;

    // Filter to only events from TODAY onwards (ignoring past)
    const today = moment().startOf('day');

    const activeProjects = projects.filter(p => p.isActive);

    const tasks = activeProjects.map(project => {
      // Get ALL events for this project to accurately draw the project timespan
      const allProjectEvents = events.filter(
        e => e.projectId === project.id && e.isToggled
      );

      let start = moment().format('YYYY-MM-DD');
      let end = moment().add(1, 'month').format('YYYY-MM-DD');

      if (allProjectEvents.length > 0) {
        allProjectEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        const actualStart = moment(allProjectEvents[0].startTime);
        start = (actualStart.isBefore(today) ? today : actualStart).format('YYYY-MM-DD');
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

    // Add a ghost task spanning a large time range to ensure the Gantt always fills screen width L-R
    tasks.push({
      id: 'ghost-boundary',
      name: '',
      start: moment().subtract(1, 'month').format('YYYY-MM-DD'),
      end: moment().add(3, 'year').format('YYYY-MM-DD'),
      progress: 0,
      custom_class: 'hidden-ghost-task'
    });

    if (tasks.filter(t => t.id !== 'ghost-boundary').length === 0) {
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
        on_click: function (task: any) {
          const el = document.querySelector('.rbc-calendar');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        },
        custom_popup_html: function (task: any) {
          const state = useAppStore.getState();
          const projectEvents = state.events.filter(e => e.projectId === task.id && e.isToggled);
          const projectClashes = detectClashes(state.projects, state.events, state.eventTypeFilters);
          const clashingIds = new Set(projectClashes.flatMap(c => [c.event1.id, c.event2.id]));
          
          const rehearsals = projectEvents.filter(e => e.type === 'rehearsal');
          const missedReh = rehearsals.filter(e => clashingIds.has(e.id)).length;
          const pct = rehearsals.length > 0 ? Math.round((missedReh / rehearsals.length) * 100) : 0;

          return `
              <div class="glass-panel p-3 min-w-[200px]">
                <h4 class="font-bold text-white mb-1">${task.name}</h4>
                <p class="text-xs text-gray-300 mb-2">${moment(task._start).format('MMM Do')} - ${moment(task._end).format('MMM Do YYYY')}</p>
                <div class="text-xs bg-gray-900/50 p-2 rounded border border-white/5">
                  <span class="${pct > 0 ? 'text-orange-400 font-bold' : 'text-green-400 border-green-500/20'}">${pct}% Rehearsals Missed / Clashing</span>
                </div>
                <p class="text-[10px] text-gray-500 mt-2 font-mono uppercase tracking-wider">Instructions:</p>
                <p class="text-[10px] text-gray-400 leading-tight">1. Right-click bar to hide project<br/>2. Click orange clash stripes to select for Calendar</p>
              </div>
            `;
        }
      });
      
      // Attach Context Menu listener for right clicking to hide
      if (ganttRef.current) {
        ganttRef.current.oncontextmenu = (e: MouseEvent) => {
          e.preventDefault();
          const target = e.target as HTMLElement;
          const barWrapper = target.closest('.bar-wrapper');
          if (barWrapper) {
            const taskId = barWrapper.getAttribute('data-id');
            if (taskId) {
              const { toggleProject } = useAppStore.getState();
              toggleProject(taskId);
              
              const proj = useAppStore.getState().projects.find(p => p.id === taskId);
              
              import('react-hot-toast').then(({ toast }) => {
                toast.success(`Removed "${proj?.name || 'Project'}"`, {
                  style: {
                    background: '#1f2937', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                  },
                  iconTheme: { primary: '#10b981', secondary: '#1f2937' },
                  action: { label: 'Undo', onClick: () => toggleProject(taskId) },
                } as any);
              });
            }
          }
        };
      }
    }

    // Stripe Injection Logic
    setTimeout(() => {
      const state = useAppStore.getState();
      const clashes = detectClashes(state.projects, state.events, state.eventTypeFilters);
      const clashingEventIds = new Set(clashes.flatMap(c => [c.event1.id, c.event2.id]));

      const barWrappers = document.querySelectorAll('.bar-wrapper');
      barWrappers.forEach(wrapper => {
        const projectId = wrapper.getAttribute('data-id');
        if (!projectId) return;

        const projectTask = tasks.find(t => t.id === projectId);
        if (!projectTask) return;

        const projEvents = events.filter(e => e.projectId === projectId && e.isToggled);
        if (projEvents.length === 0) return;

        const mainBar = wrapper.querySelector('.bar') as SVGRectElement;
        if (!mainBar) return;

        const barX = parseFloat(mainBar.getAttribute('x') || '0');
        const barWidth = parseFloat(mainBar.getAttribute('width') || '0');
        const barHeight = parseFloat(mainBar.getAttribute('height') || '0');
        const barY = parseFloat(mainBar.getAttribute('y') || '0');

        const projStartMs = new Date(projectTask.start).getTime();
        const projEndMs = new Date(projectTask.end).getTime();
        const projDuration = projEndMs - projStartMs;

        wrapper.querySelectorAll('.event-stripe').forEach(el => el.remove());

        if (projDuration > 0) {
          projEvents.forEach(e => {
            const isClash = clashingEventIds.has(e.id);
            const eStartMs = e.startTime.getTime();
            const eEndMs = e.endTime.getTime();
            
            // Adjust start point if it's before the clipped visual start
            if (eEndMs < projStartMs) return; // Completely invisible

            const boundedStartMs = Math.max(eStartMs, projStartMs);
            const eDuration = Math.max(eEndMs - boundedStartMs, 86400000 / 2); // Min 12h visual width

            const offsetRatio = (boundedStartMs - projStartMs) / projDuration;
            const widthRatio = eDuration / projDuration;

            const rectX = barX + (offsetRatio * barWidth);
            const rectWidth = Math.max(widthRatio * barWidth, 4); 

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', 'event-stripe');
            rect.setAttribute('x', rectX.toString());
            rect.setAttribute('y', barY.toString());
            rect.setAttribute('width', rectWidth.toString());
            rect.setAttribute('height', barHeight.toString());
            rect.setAttribute('fill', isClash ? '#f97316' : 'rgba(255,255,255,0.4)'); 
            rect.setAttribute('rx', '2');
            rect.setAttribute('ry', '2');
            
            if (isClash) {
              rect.style.cursor = 'pointer';
              rect.onclick = (event) => {
                event.stopPropagation();
                useAppStore.getState().setSelectedClashEventId(e.id);
                const el = document.querySelector('.rbc-calendar');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              };
            }

            wrapper.appendChild(rect);
          });
        }
      });

      // --- Draw Month Gridlines ---
      const gridHeader = document.querySelector('.gantt .grid-header');
      if (gridHeader) {
        // Remove old month lines globally safely
        document.querySelectorAll('.gantt .month-gridline').forEach(el => el.remove());
        document.querySelectorAll('.gantt .month-gridline-label').forEach(el => el.remove());

        // We need to figure out where the months start visually. 
        // A simple way is to find the lower-text elements that represent the first day of a month
        // or interpolate based on the total width and time range.
        const totalDurationMs = new Date(tasks[0].end).getTime() - new Date(tasks[0].start).getTime();
        const totalWidth = Array.from(document.querySelectorAll('.gantt .grid-row'))
            .reduce((max, row) => Math.max(max, parseFloat(row.getAttribute('width') || '0')), 0);

        if(totalWidth > 0 && totalDurationMs > 0) {
            let currentMonth = moment(tasks[0].start).startOf('month');
            const endMonth = moment(tasks[tasks.length-1].end).endOf('month');
            
            // Find root SVG group to append gridlines so they don't get clipped by row wrappers
            const svgGroup = document.querySelector('.gantt .grid-background')?.parentElement;

            if (svgGroup) {
              // Clean existing gridlines explicitly first
              svgGroup.querySelectorAll('.month-gridline').forEach(el => el.remove());
              
              while(currentMonth.isBefore(endMonth)) {
                  const monthStartMs = currentMonth.valueOf();
                  
                  if (monthStartMs >= new Date(tasks[0].start).getTime()) {
                      const ratio = (monthStartMs - new Date(tasks[0].start).getTime()) / totalDurationMs;
                      const xPos = ratio * totalWidth;

                      const svgHeight = document.querySelector('.gantt svg')?.getAttribute('height') || '1000';
                      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                      line.setAttribute('class', 'month-gridline');
                      line.setAttribute('x1', xPos.toString());
                      line.setAttribute('y1', '0');
                      line.setAttribute('x2', xPos.toString());
                      line.setAttribute('y2', svgHeight);
                      line.setAttribute('stroke', 'rgba(255, 255, 255, 0.15)');
                      line.setAttribute('stroke-width', '2');
                      line.setAttribute('stroke-dasharray', '4,4');
                      svgGroup.appendChild(line);
                  }
                  currentMonth.add(1, 'month');
              }
            }
        }
      }

      // Auto-scroll to "Today" to clamp view left-alignment
      const scrollWrapper = document.querySelector('.gantt-scroll-wrapper') as HTMLElement;
      const todayLine = document.querySelector('.gantt .today-highlight');
      if (scrollWrapper && todayLine) {
        const xPos = parseFloat(todayLine.getAttribute('x') || '0');
        // Scroll so today is 20px from the left edge
        scrollWrapper.scrollLeft = Math.max(0, xPos - 20);
      }

      // Implement Freeze-Pane Sticky Header 
      const svg = document.querySelector('.gantt svg');
      if (svg && scrollWrapper) {
          let stickyGroup = svg.querySelector('.sticky-header-group') as SVGGElement;
          if (!stickyGroup) {
              stickyGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              stickyGroup.setAttribute('class', 'sticky-header-group');
              svg.appendChild(stickyGroup); // Append to very end so it has highest Z-index over bars

              // Add the semi-transparent black header background
              const gridHeaderBg = document.querySelector('.gantt .grid-header');
              if (gridHeaderBg) {
                  stickyGroup.appendChild(gridHeaderBg);
              }

              // Extract all text labels from the ticks and copy them into the sticky group
              const ticks = document.querySelectorAll('.gantt .tick');
              ticks.forEach(tick => {
                  const upper = tick.querySelector('.upper-text');
                  const lower = tick.querySelector('.lower-text');
                  const transform = tick.getAttribute('transform');
                  
                  if (upper) {
                      const clonedUpper = upper.cloneNode(true) as SVGTextElement;
                      if (transform) clonedUpper.setAttribute('transform', transform);
                      stickyGroup.appendChild(clonedUpper);
                      upper.setAttribute('visibility', 'hidden');
                  }
                  if (lower) {
                      const clonedLower = lower.cloneNode(true) as SVGTextElement;
                      if (transform) clonedLower.setAttribute('transform', transform);
                      stickyGroup.appendChild(clonedLower);
                      lower.setAttribute('visibility', 'hidden');
                  }
              });
          }

          // Attach scroll sync listener
          const handleScroll = () => {
             if (stickyGroup) {
                // translate down according to vertical scroll 
                stickyGroup.style.transform = `translateY(${scrollWrapper.scrollTop}px)`;
             }
          };
          scrollWrapper.addEventListener('scroll', handleScroll);
          
          // Trigger once immediately
          handleScroll();
      }

    }, 150); // Small timeout to ensure Frappe Gantt has finished SVG rendering

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
            onClick={() => setViewMode('Week')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${viewMode === 'Week' ? 'bg-purple-600 text-white' : 'glass-panel text-gray-400 hover:text-white'}`}
          >
            Week View
          </button>
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

        <div className="glass-panel p-0 overflow-hidden custom-gantt-theme">
          <div className="w-full max-h-[600px] overflow-y-auto overflow-x-auto relative gantt-scroll-wrapper">
             <div ref={ganttRef} className="w-full min-w-max"></div>
          </div>
        </div>
      </div>
    </>
  );
}
