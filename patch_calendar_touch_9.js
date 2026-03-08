const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'CalendarView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The regex I used to inject the date state overwrote `localizer` which was placed directly under `<DnDCalendar`.
content = content.replace(/<DnDCalendar[\s\S]*?view=\{calendarView\}/,
  `<DnDCalendar
        localizer={localizer}
        view={calendarView}`);

fs.writeFileSync(filePath, content);
