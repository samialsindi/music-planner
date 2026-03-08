const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'CalendarView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/Removed "\{props\.event\.title\}"/, 'Removed &quot;{props.event.title}&quot;');

fs.writeFileSync(filePath, content);
console.log('patched src/components/CalendarView.tsx quotes');
