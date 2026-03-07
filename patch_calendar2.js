const fs = require('fs');
const file = 'src/components/CalendarView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('views={["month"]}', 'views={["month"]}\n        popup={true}');

fs.writeFileSync(file, content);
