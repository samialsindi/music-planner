'use client';
import { useAppStore } from '@/lib/store';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { detectClashes } from '@/lib/clash';

const localizer = momentLocalizer(moment);

export default function CalendarView() {
  const { events, projects, toggleEvent, eventTypeFilters } = useAppStore();
  
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

  return (
    <div className="h-[600px] glass-panel p-6 mt-6">
      <Calendar
        localizer={localizer}
        popup={true}
        defaultView="month"
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        tooltipAccessor={(e: any) => `${e.title} - ${e.resource.type}`}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={(e: any) => {
          // Allow toggling entirely off from the calendar directly
          if (confirm(`Decline just this event: "${e.title}"?`)) {
            toggleEvent(e.id);
          }
        }}
        className="custom-calendar-theme"
      />
    </div>
  );
}
