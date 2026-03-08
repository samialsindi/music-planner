const fs = require('fs');
const file = 'src/components/CalendarView.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `  const calendarEvents = events
    .filter(e => e && !settings.hiddenEventIds.includes(e.id) && projects.find(p => p.id === e.projectId) && !settings.hiddenProjectIds.includes(e.projectId) && eventTypeFilters[e.type as keyof typeof eventTypeFilters]) // Only show toggled events for active projects and allowed types
    .map(e => ({
      id: e.id,
      title: e.title,
      start: new Date(e.startTime),
      end: new Date(e.endTime),
      allDay: e.isAllDay,
      resource: e,
    }));`;

const replacement = `  // Format events for react-big-calendar
  const { orchestras } = useAppStore();
  const calendarEvents = events
    .filter(e => e && !settings.hiddenEventIds.includes(e.id) && projects.find(p => p.id === e.projectId) && !settings.hiddenProjectIds.includes(e.projectId) && eventTypeFilters[e.type as keyof typeof eventTypeFilters]) // Only show toggled events for active projects and allowed types
    .map(e => {
      const project = projects.find(p => p.id === e.projectId);
      const orchestra = project ? orchestras.find(o => o.id === project.orchestraId) : null;

      let fullTitle = e.title;
      if (orchestra && project) {
        // Build "Orchestra - Project - Event" string
        fullTitle = \`\${orchestra.name} - \${project.name} - \${e.title}\`;
      } else if (project) {
        fullTitle = \`\${project.name} - \${e.title}\`;
      }

      return {
        id: e.id,
        title: fullTitle,
        start: new Date(e.startTime),
        end: new Date(e.endTime),
        allDay: e.isAllDay,
        resource: e,
      };
    });`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log('Successfully updated CalendarView.tsx');
} else {
  console.log('Target string not found in CalendarView.tsx');
}
