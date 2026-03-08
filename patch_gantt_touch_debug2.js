const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'GanttView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('import { useLongPress }')) {
  content = `import { useLongPress } from '@/hooks/useLongPress';\n` + content;
}

fs.writeFileSync(filePath, content);
