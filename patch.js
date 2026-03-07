const fs = require('fs');
let file = fs.readFileSync('src/app/layout.tsx', 'utf8');

file = file.replace(/<aside className="w-64 glass-panel m-4 flex flex-col p-6 fixed h-\[calc\(100vh-2rem\)\] z-10 transition-all">/, '<aside className="hidden lg:flex w-64 glass-panel m-4 flex-col p-6 fixed h-[calc(100vh-2rem)] z-10 transition-all">');
file = file.replace(/<main className="flex-1 ml-\[calc\(16rem\+2rem\)\] p-8 relative flex flex-col min-h-screen">/, '<main className="flex-1 lg:ml-[calc(16rem+2rem)] p-4 lg:p-8 relative flex flex-col min-h-screen w-full">');

fs.writeFileSync('src/app/layout.tsx', file);
