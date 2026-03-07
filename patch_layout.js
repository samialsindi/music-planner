const fs = require('fs');
const file = 'src/app/layout.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/<<<<<<< Updated upstream[\s\S]*?=======\n/, '');
content = content.replace(/>>>>>>> Stashed changes\n/, '');
content = content.replace(/<<<<<<< Updated upstream[\s\S]*?=======\n/, '');
content = content.replace(/>>>>>>> Stashed changes\n/, '');


fs.writeFileSync(file, content);
