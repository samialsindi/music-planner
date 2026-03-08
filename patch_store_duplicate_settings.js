const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'lib', 'store.ts');
let content = fs.readFileSync(filePath, 'utf8');

// The replacement script added `const { settings } = get();` when there was already one.
// Let's print `toggleProject` to see it.
const lines = content.split('\n');
const start = lines.findIndex(l => l.includes('toggleProject: async'));
console.log(lines.slice(start, start + 20).join('\n'));
