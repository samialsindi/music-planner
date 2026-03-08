const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'CalendarView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The calendar component needs to use the new global state.
// We should replace `defaultView="month"` with `view={calendarView}` and `onView={(view) => setCalendarView(view)}`
// And `date={calendarDate}` and `onNavigate={(date) => setCalendarDate(date)}`

content = content.replace(/const \{ events, projects, toggleEvent, eventTypeFilters, toggleEventType, selectedClashEventId, setSelectedClashEventId, settings, undoLastAction \} = useAppStore\(\);/,
  `const { events, projects, toggleEvent, eventTypeFilters, toggleEventType, selectedClashEventId, setSelectedClashEventId, settings, undoLastAction, calendarDate, calendarView, setCalendarDate, setCalendarView } = useAppStore();`);

content = content.replace(/<DnDCalendar[\s\S]*?defaultView="month"/,
  `<DnDCalendar
        view={calendarView}
        onView={(v: any) => setCalendarView(v)}
        date={calendarDate}
        onNavigate={(d: Date) => setCalendarDate(d)}`);

fs.writeFileSync(filePath, content);
console.log('patched src/components/CalendarView.tsx for navigation');
