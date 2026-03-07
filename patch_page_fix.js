const fs = require('fs');
const path = 'src/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "const { addEvent, projects, orchestras, setOrchestras, setProjects, setEvents } = useAppStore();",
  "const { addEvent, projects, events, orchestras, setOrchestras, setProjects, setEvents } = useAppStore();"
);

fs.writeFileSync(path, content, 'utf8');
