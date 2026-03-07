const fs = require('fs');
const file = 'src/components/GanttView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update default view to Year based on current master implementation
content = content.replace("useState<'Month' | 'Year'>('Month')", "useState<'Month' | 'Year'>('Year')");

fs.writeFileSync(file, content);
