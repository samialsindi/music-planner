const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'GanttView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// We need to add an `on_click` handler to the Frappe Gantt initialization to navigate the Calendar
content = content.replace(/const \{ events, projects, eventTypeFilters, settings, undoLastAction \} = useAppStore\(\);/,
  `const { events, projects, eventTypeFilters, settings, undoLastAction, setCalendarDate, setCalendarView } = useAppStore();`);

content = content.replace(/on_click: \(task: any\) => \{/,
  `on_click: (task: any) => {
        // Navigate to Calendar
        if (!task.id.startsWith('ghost-') && !task.id.startsWith('proj-')) {
           const clickedEvent = events.find(e => e.id === task.id);
           if (clickedEvent) {
             setCalendarDate(new Date(clickedEvent.startTime));
             setCalendarView('week');
             // Scroll window up to calendar view if they're on mobile/small screens
             window.scrollTo({ top: 0, behavior: 'smooth' });
           }
        }
`);

// What if the codebase didn't have an `on_click: (task: any) => {` ?
// Let's check how Gantt was initialized first.
