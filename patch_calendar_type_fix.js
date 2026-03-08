const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'CalendarView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// I put longPressProps inside the component but let's check exactly where.
const declarationIdx = content.indexOf('const longPressProps = useLongPress');
console.log(declarationIdx);
