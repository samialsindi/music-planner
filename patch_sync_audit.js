const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'api', 'sync', 'route.ts');
let content = fs.readFileSync(filePath, 'utf8');

// The prompt asked to clear the audit log on sync. Let's do that at the beginning of the sync route.
content = content.replace(/try \{/,
  `try {
        // Clear audit log to prevent undoing stale IDs
        await supabase.from('audit_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
`);

fs.writeFileSync(filePath, content);
console.log('patched src/app/api/sync/route.ts to clear audit log');
