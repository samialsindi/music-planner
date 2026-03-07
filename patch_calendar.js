const fs = require('fs');

const path = 'src/components/CalendarView.tsx';
let content = fs.readFileSync(path, 'utf8');

// Filter out pending events
content = content.replace(
  "const { events, projects, eventTypeFilters } = useAppStore();",
  "const { events, projects, eventTypeFilters } = useAppStore();\n  const activeEvents = events.filter(e => e.status !== 'pending');"
);

content = content.replace(
  "events.filter((e) => {",
  "activeEvents.filter((e) => {"
);

fs.writeFileSync(path, content, 'utf8');
