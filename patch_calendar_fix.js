const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'CalendarView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The regex replaced projects.find(p => p.id === e.projectId)?.isActive with projects.find(p => p.id === e.projectId)? && !settings.hiddenProjectIds.includes(p.id) which has a syntax error ? &&.
content = content.replace(/\? && !settings\.hiddenProjectIds\.includes\(p\.id\)/,
  ` && !settings.hiddenProjectIds.includes(e.projectId)`);

fs.writeFileSync(filePath, content);
console.log('patched src/components/CalendarView.tsx for compilation error');
