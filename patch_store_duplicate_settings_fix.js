const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'lib', 'store.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/    const \{ settings \} = get\(\);\n    const isCurrentlyHidden = settings.hiddenProjectIds.includes\(projectId\);\n    const newHiddenIds/g, '    const newHiddenIds');
content = content.replace(/    const \{ settings \} = get\(\);\n    const isCurrentlyHidden = settings.hiddenEventIds.includes\(eventId\);\n    const newHiddenIds/g, '    const newHiddenIds');

fs.writeFileSync(filePath, content);
