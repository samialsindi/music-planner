'use client';
import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { detectClashes } from '@/lib/clash';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

export default function CalendarView() {
  const { events, projects, toggleEvent, eventTypeFilters, toggleEventType, selectedClashEventId, setSelectedClashEventId } = useAppStore();
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const CustomEventComponent = (props: any) => {
    return (
      <div 
        className="w-full h-full"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Instantly hide the event on right click
          toggleEvent(props.event.id);
          
          // Show undo toast
          import('react-hot-toast').then(({ toast }) => {
            toast((t) => (
              <span className="flex items-center gap-2">
                Removed "{props.event.title}"
                <button 
                  onClick={() => { toggleEvent(props.event.id); toast.dismiss(t.id); }}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs ml-2"
                >
                  Undo
                </button>
              </span>
            ), {
              style: {
                background: '#1f2937', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
              }
            });
          });
        }}
      >
        {props.title}
      </div>
    );
  };
  
  // Format events for react-big-calendar
  const calendarEvents = events
    .filter(e => e.isToggled && projects.find(p => p.id === e.projectId)?.isActive && eventTypeFilters[e.type as keyof typeof eventTypeFilters]) // Only show toggled events for active projects and allowed types
    .map(e => ({
      id: e.id,
      title: e.title,
      start: new Date(e.startTime),
      end: new Date(e.endTime),
      allDay: e.isAllDay,
      resource: e,
    }));

  // Run clash detection to highlight them uniquely in UI
  const clashes = detectClashes(projects, events, eventTypeFilters);
  const clashingEventIds = new Set(
    clashes.flatMap(c => [c.event1.id, c.event2.id])
  );

  const eventStyleGetter = (event: any) => {
    const isClashing = clashingEventIds.has(event.id);
    const project = projects.find(p => p.id === event.resource.projectId);
    
    // Base style from project color, overridden if clashing
    let backgroundColor = project?.color || '#6b21a8';
    let borderColor = project?.color || 'transparent';
    let opacity = 0.7;
    let textDecoration = 'none';
    let color = '#ffffff';
    let borderLeft = `4px solid ${borderColor}`;
    
    if (isClashing) {
      backgroundColor = 'var(--clash-red)';
      borderColor = '#fff';
      opacity = 0.9;
      borderLeft = `4px solid #fff`;
    }

    // Cross out target when user clicks a clash in Gantt View
    if (selectedClashEventId) {
      const selectedEvent = events.find(e => e.id === selectedClashEventId);
      if (selectedEvent && event.id !== selectedClashEventId) {
        // Check temporal overlap
        const e1Start = event.start.getTime();
        const e1End = event.end.getTime();
        const e2Start = selectedEvent.startTime.getTime();
        const e2End = selectedEvent.endTime.getTime();
        
        if (e1Start < e2End && e1End > e2Start) {
          // This event overlaps with the selected clash event! Cross it out
          backgroundColor = 'rgba(225, 29, 72, 0.1)'; // faint red
          borderColor = 'var(--clash-red)';
          color = 'var(--clash-red)';
          textDecoration = 'line-through';
          opacity = 0.5;
          borderLeft = `1px solid var(--clash-red)`;
        }
      }
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderRadius: '6px',
        opacity,
        color,
        border: `1px solid ${borderColor}`,
        borderLeft,
        textDecoration,
        display: 'block',
        textShadow: textDecoration === 'none' ? '0 1px 2px rgba(0,0,0,0.8)' : 'none'
      }
    };
  };

  const { minTime, maxTime } = useMemo(() => {
    const min = new Date();
    min.setHours(12, 0, 0, 0); // Start at 12 PM
    const max = new Date();
    max.setHours(23, 59, 59, 999); // End at 12 AM
    return { minTime: min, maxTime: max };
  }, []);

  const onEventDrop = async ({ event, start, end }: any) => {
    const updated = { ...event.resource, startTime: start, endTime: end };
    useAppStore.getState().updateEvent(updated);
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
    await supabase.from('events').update({ start_time: start.toISOString(), end_time: end.toISOString() }).eq('id', updated.id);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Event Type Filters Above Calendar */}
      <div className="flex flex-wrap gap-2 justify-end glass-panel px-6 py-3 rounded-xl border border-white/5 items-center">
        {selectedClashEventId && (
          <button 
            onClick={() => setSelectedClashEventId(null)}
            className="mr-auto text-xs font-bold text-red-400 bg-red-400/10 px-3 py-1.5 rounded hover:bg-red-400/20 transition flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            Clear Selected Clash
          </button>
        )}
        <span className="text-sm font-bold text-gray-400 mr-2 self-center">Filter Events:</span>
        {(['rehearsal', 'concert', 'personal', 'other'] as const).map((type) => (
          <button
            key={type}
            onClick={() => toggleEventType(type)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex border ${
              eventTypeFilters[type]
                ? 'bg-purple-600/20 text-purple-400 border-purple-500/50 hover:bg-purple-600/30'
                : 'bg-gray-800/50 text-gray-500 border-gray-700/50 hover:bg-gray-800'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="h-[600px] glass-panel p-6 relative">
        <DnDCalendar
        localizer={localizer}
        popup={true}
        defaultView="month"
        events={calendarEvents}
        startAccessor={(e: any) => e.start}
        endAccessor={(e: any) => e.end}
        min={minTime}
        max={maxTime}
        tooltipAccessor={(e: any) => `${e.title} - ${e.resource.type}`}
        eventPropGetter={eventStyleGetter}
        components={{
          event: CustomEventComponent
        }}
        onEventDrop={onEventDrop}
        onEventResize={onEventDrop}
        resizable
        onSelectEvent={(e: any) => {
          setEditingEvent(e);
        }}
        className="custom-calendar-theme"
      />
    </div>

    {/* Event Edit Modal */}
    {editingEvent && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-gray-900 border border-white/10 rounded-xl p-6 w-[400px] max-w-full shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-4">Edit Event</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Title</label>
              <input 
                className="w-full bg-black/50 border border-white/5 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                value={editingEvent.title}
                onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Assign to Project</label>
              <div className="flex gap-2">
                <select 
                  className="w-full bg-black/50 border border-white/5 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                  value={editingEvent.resource.projectId}
                  onChange={(e) => setEditingEvent({...editingEvent, resource: {...editingEvent.resource, projectId: e.target.value}})}
                >
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button
                  className="shrink-0 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-lg transition-colors border border-gray-700"
                  onClick={async () => {
                    const name = window.prompt("Enter new project name:");
                    if (name && name.trim()) {
                      const { createClient } = await import('@supabase/supabase-js');
                      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
                      
                      // Using the first orchestra as a default for quick-add, or ideally a generic one
                      const orchestraId = projects[0]?.orchestraId || undefined;
                      
                      if (orchestraId) {
                         const { data: newProj, error } = await supabase.from('projects').insert({
                           name: name.trim(),
                           orchestra_id: orchestraId,
                           color: '#3b82f6' // default blue
                         }).select().single();
                         
                         if (!error && newProj) {
                           useAppStore.getState().setProjects([...projects, {
                             id: newProj.id,
                             name: newProj.name,
                             orchestraId: newProj.orchestra_id,
                             color: newProj.color,
                             isActive: newProj.is_active
                           }]);
                           setEditingEvent({...editingEvent, resource: {...editingEvent.resource, projectId: newProj.id}});
                         }
                      } else {
                         alert("No orchestra found to attach this project to.");
                      }
                    }
                  }}
                >
                  + New
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center mt-8 pt-4 border-t border-white/10">
              <button 
                onClick={() => {
                  toggleEvent(editingEvent.id);
                  setEditingEvent(null);
                }}
                className="text-red-400 text-sm font-medium hover:text-red-300 transition-colors bg-red-500/10 px-3 py-1.5 rounded"
              >
                Hide Event
              </button>

              <div className="flex gap-3">
                <button 
                  onClick={() => setEditingEvent(null)} 
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    const updated = { 
                      ...editingEvent.resource, 
                      projectId: editingEvent.resource.projectId,
                      title: editingEvent.title 
                    };
                    useAppStore.getState().updateEvent(updated);
                    setEditingEvent(null);
                    
                    const { createClient } = await import('@supabase/supabase-js');
                    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
                    await supabase.from('events').update({ project_id: updated.projectId, title: updated.title }).eq('id', updated.id);
                  }} 
                  className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-bold transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
