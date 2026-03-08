'use client';
import { useAppStore } from '@/lib/store';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { detectClashes } from '@/lib/clash';

const localizer = momentLocalizer(moment);

export default function CalendarView() {
  const { events, projects, toggleEvent, eventTypeFilters, toggleEventType } = useAppStore();
  
  // Format events for react-big-calendar
  const calendarEvents = events
    .filter(e => e.isToggled && projects.find(p => p.id === e.projectId)?.isActive && eventTypeFilters[e.type as keyof typeof eventTypeFilters]) // Only show toggled events for active projects and allowed types
    .map(e => ({
      id: e.id,
      title: e.title,
      start: new Date(e.startTime),
      end: new Date(e.endTime),
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
    let backgroundColor = project?.color || '#3174ad';
    let borderColor = 'transparent';
    
    if (isClashing) {
      backgroundColor = 'var(--clash-red)';
      borderColor = '#fff';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderRadius: '8px',
        opacity: 0.9,
        color: 'white',
        border: `1px solid ${borderColor}`,
        display: 'block',
      }
    };
  };

  const minTime = new Date();
  minTime.setHours(12, 0, 0); // Start at 12 PM

  const maxTime = new Date();
  maxTime.setHours(23, 59, 59); // End at 12 AM

  return (
    <div className="flex flex-col gap-4">
      {/* Event Type Filters Above Calendar */}
      <div className="flex flex-wrap gap-2 justify-end glass-panel px-6 py-3 rounded-xl border border-white/5">
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
        <Calendar
        localizer={localizer}
        popup={true}
        defaultView="month"
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        min={minTime}
        max={maxTime}
        tooltipAccessor={(e: any) => `${e.title} - ${e.resource.type}`}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={(e: any) => {
          // Instantly hide the event
          toggleEvent(e.id);
          
          // Show undo toast
          import('react-hot-toast').then(({ toast }) => {
            toast.success(`Removed "${e.title}"`, {
              style: {
                background: '#1f2937',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
              },
              iconTheme: { primary: '#10b981', secondary: '#1f2937' },
              action: {
                label: 'Undo',
                onClick: () => toggleEvent(e.id),
              },
            } as any);
          });
        }}
        className="custom-calendar-theme"
      />
    </div>
    </div>
  );
}
