'use client';
import { useAppStore } from '@/lib/store';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { detectClashes } from '@/lib/clash';

const localizer = momentLocalizer(moment);


const CustomToolbar = (toolbar: any) => {
  const goToBack = () => {
    toolbar.onNavigate('PREV');
  };

  const goToNext = () => {
    toolbar.onNavigate('NEXT');
  };

  const goToCurrent = () => {
    toolbar.onNavigate('TODAY');
  };

  const label = () => {
    const date = moment(toolbar.date);
    return (
      <span className="text-xl font-bold text-white">
        {date.format('MMMM YYYY')}
      </span>
    );
  };

  return (
    <div className="flex justify-between items-center mb-4 rbc-toolbar custom-toolbar">
      <div className="flex gap-2">
        <button className="px-3 py-1 rounded glass-panel hover:bg-white/10 transition-colors text-white" onClick={goToBack}>
          &#8592;
        </button>
        <button className="px-3 py-1 rounded glass-panel hover:bg-white/10 transition-colors text-white" onClick={goToCurrent}>
          Today
        </button>
        <button className="px-3 py-1 rounded glass-panel hover:bg-white/10 transition-colors text-white" onClick={goToNext}>
          &#8594;
        </button>
      </div>
      <div className="text-center">{label()}</div>
      <div className="flex gap-2 invisible md:visible">
        {/* Empty space to balance flex-between, or view toggles if we had them */}
      </div>
    </div>
  );
};

export default function CalendarView() {

  const { events, projects, toggleEvent } = useAppStore();
  
  // Create a map of active project IDs for quick lookup
  const activeProjectIds = new Set(projects.filter(p => p.isActive).map(p => p.id));

  // Format events for react-big-calendar
  const calendarEvents = events
    .filter(e => e.isToggled && activeProjectIds.has(e.projectId)) // Only show toggled events for active projects
    .map(e => ({
      id: e.id,
      title: e.title,
      start: e.startTime,
      end: e.endTime,
      resource: e,
    }));

  // Run clash detection to highlight them uniquely in UI
  const clashes = detectClashes(projects, events);
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
    <div className="min-h-[600px] glass-panel p-4 md:p-6 mt-6 flex flex-col">
      <Calendar
        views={["month"]}
        popup={true}
        defaultView="month"
        components={{
          toolbar: CustomToolbar
        }}
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        tooltipAccessor={(e: any) => `${e.title} - ${e.resource.type}`}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={(e: any) => {
          // Allow toggling entirely off from the calendar directly
          if (confirm(`Hide "${e.title}" from your schedule?`)) {
            toggleEvent(e.id);
          }
        }}
        className="custom-calendar-theme flex-1 min-h-[500px]"
      />
    </div>
  );
}
