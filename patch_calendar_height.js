const fs = require('fs');
const file = 'src/components/CalendarView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace standard height constraint so we can fit calendar effectively without hard vertical scroll
content = content.replace('h-[600px] glass-panel p-6 mt-6', 'min-h-[600px] glass-panel p-4 md:p-6 mt-6 flex flex-col');
content = content.replace('className="custom-calendar-theme"', 'className="custom-calendar-theme flex-1 min-h-[500px]"');

fs.writeFileSync(file, content);
