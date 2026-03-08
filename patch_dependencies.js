const fs = require('fs');
const path = require('path');

let content;

// Fix page.tsx dependencies
const pagePath = path.join(__dirname, 'src', 'app', 'page.tsx');
content = fs.readFileSync(pagePath, 'utf8');
content = content.replace(/\[setOrchestras, setProjects, setEvents\]\);/, '[setOrchestras, setProjects, setEvents, setSettings]);');
fs.writeFileSync(pagePath, content);

// Fix GanttView.tsx dependencies
const ganttPath = path.join(__dirname, 'src', 'components', 'GanttView.tsx');
content = fs.readFileSync(ganttPath, 'utf8');
content = content.replace(/\[events, projects, viewMode, eventTypeFilters\]\);/, '[events, projects, viewMode, eventTypeFilters, settings.hiddenEventIds, settings.hiddenProjectIds]);');
fs.writeFileSync(ganttPath, content);

console.log('Fixed react hook warnings');
