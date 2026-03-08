const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'CalendarView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// There's a parsing error in CalendarView.tsx line 56, likely an artifact of my component regexes.
// Looking at line 55/56
const lines = content.split('\n');
console.log(lines.slice(50, 60).join('\n'));
