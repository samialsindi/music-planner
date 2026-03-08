const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'hooks', 'useLongPress.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/useRef<NodeJS\.Timeout>\(\);/, 'useRef<NodeJS.Timeout | null>(null);');
content = content.replace(/useRef<EventTarget>\(\);/, 'useRef<EventTarget | null>(null);');

fs.writeFileSync(filePath, content);
