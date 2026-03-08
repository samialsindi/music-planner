const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'CalendarView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log(lines.slice(25, 40).join('\n'));
