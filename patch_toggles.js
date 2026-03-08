const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'ProjectToggles.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/!settings\.hiddenProjectIds\.includes\(p\.id\)/g, '!settings.hiddenProjectIds.includes(project.id)');

fs.writeFileSync(filePath, content);
