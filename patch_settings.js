const fs = require('fs');
const file = 'src/app/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace the line that gets values from useAppStore
code = code.replace(
  /const \{ addEvent, projects, events, orchestras, setOrchestras, setProjects, setEvents, setSettings \} = useAppStore\(\);/,
  'const { addEvent, projects, events, orchestras, setOrchestras, setProjects, setEvents, setSettings, settings } = useAppStore();'
);

fs.writeFileSync(file, code);
