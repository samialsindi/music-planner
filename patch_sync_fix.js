const fs = require('fs');
const path = 'src/app/api/sync/route.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(" events by id (keep the last one)", "// events by id (keep the last one)");

fs.writeFileSync(path, content, 'utf8');
