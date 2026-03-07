const fs = require('fs');
const file = 'src/components/CalendarView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('<Calendar', '<Calendar\n        views={["month"]}\n        defaultView="month"');

fs.writeFileSync(file, content);
