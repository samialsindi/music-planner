const fs = require('fs');

const file = 'src/app/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Hide the voice input button by commenting it out or removing it
code = code.replace(/<button[^>]*onClick=\{toggleVoiceInput\}[^>]*>[\s\S]*?<\/button>/, '');

fs.writeFileSync(file, code);
