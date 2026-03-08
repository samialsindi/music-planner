const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'GanttView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add import for useLongPress
if (!content.includes('useLongPress')) {
  content = content.replace(/import \{ supabase \} from '@\/lib\/supabase';/, `import { supabase } from '@/lib/supabase';\nimport { useLongPress } from '@/hooks/useLongPress';`);
}

// Add the hook inside the component
content = content.replace(/const \[contextMenu, setContextMenu\] = useState<\(\{x: number, y: number\} \| null\)>\(null\);/,
  `const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);

  const longPressProps = useLongPress((e: any) => {
    // Prevent default context menu on touch devices
    if (e.touches) e.preventDefault();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    setContextMenu({ x, y });
  });`);

// Update the div wrapper to spread the hook props
content = content.replace(/<div className="flex flex-col gap-4" onContextMenu=\{\(e\) => \{ e\.preventDefault\(\); setContextMenu\(\{ x: e\.clientX, y: e\.clientY \}\); \}\} onClick=\{\(\) => setContextMenu\(null\)\}>/,
  `<div className="flex flex-col gap-4" {...longPressProps} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); }} onClick={() => setContextMenu(null)}>`);

fs.writeFileSync(filePath, content);
console.log('patched src/components/GanttView.tsx for touch');
