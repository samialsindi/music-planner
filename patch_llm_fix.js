const fs = require('fs');
const path = 'src/lib/llm.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "isToggled: true,",
  "isToggled: true,\n    isAllDay: false,\n    status: 'approved',"
);

fs.writeFileSync(path, content, 'utf8');
