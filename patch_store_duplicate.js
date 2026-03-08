const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'lib', 'store.ts');
let content = fs.readFileSync(filePath, 'utf8');

// There are multiple `toggleEventType` implementations.
// One is async that updates DB, one is the old synchronous one.
const oldToggleMatch = /toggleEventType: \(eventType\) => \{[\s\S]*?return \{ eventTypeFilters: newFilters \};\s*\}\);\s*\},/g;
content = content.replace(oldToggleMatch, '');

fs.writeFileSync(filePath, content);
