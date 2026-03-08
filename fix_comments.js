const fs = require('fs');
const file = 'src/components/CalendarView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\/\/ Format events for react-big-calendar\n  \/\/ Format events for react-big-calendar/, '// Format events for react-big-calendar');
fs.writeFileSync(file, content);
