const fs = require('fs');
const content = fs.readFileSync('src/app/hidden/page.tsx', 'utf8');
fs.writeFileSync('src/app/hidden/page.tsx', content.replace('toggleProjectFilter', 'toggleProject').replace('toggleProjectFilter', 'toggleProject').replace('toggleProjectFilter', 'toggleProject').replace('toggleEventFilter', 'toggleEvent').replace('toggleEventFilter', 'toggleEvent'));
