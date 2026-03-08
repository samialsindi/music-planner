const fs = require('fs');

const file = 'src/app/layout.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/<Link href="\/" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white\/5">\s*<svg[^>]*>.*?<\/svg>\s*Calendar\s*<\/Link>/s,
  `<Link href="/calendar" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5">\n              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>\n              Calendar\n            </Link>`);

code = code.replace(/<Link href="\/" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white\/5">\s*<svg[^>]*>.*?<\/svg>\s*Gantt View\s*<\/Link>/s,
  `<Link href="/gantt" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5">\n              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h7"/></svg>\n              Gantt View\n            </Link>`);

code = code.replace(/<Link href="\/" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white\/5">\s*<svg[^>]*>.*?<\/svg>\s*Projects\s*<\/Link>/s,
  `<Link href="/projects" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5">\n              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>\n              Projects\n            </Link>`);

// Add home dashboard link
code = code.replace(/<nav className="flex flex-col gap-4 flex-1">/,
  `<nav className="flex flex-col gap-4 flex-1">\n            <Link href="/" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5">\n              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>\n              Dashboard\n            </Link>`);

fs.writeFileSync(file, code);
