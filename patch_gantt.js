const fs = require('fs');
const path = 'src/components/GanttView.tsx';
let content = fs.readFileSync(path, 'utf8');

// Filter out pending events
content = content.replace(
  "const { events, projects, eventTypeFilters } = useAppStore();",
  "const { events, projects, eventTypeFilters } = useAppStore();\n  const activeEventsList = events.filter(e => e.status !== 'pending');"
);

content = content.replace(
  "const activeEvents = events.filter((e) => {",
  "const activeEvents = activeEventsList.filter((e) => {"
);

fs.writeFileSync(path, content, 'utf8');
