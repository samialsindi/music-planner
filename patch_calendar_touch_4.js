const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'CalendarView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/const \[contextMenu, setContextMenu\] = useState<\(\{x: number, y: number\} \| null\)>\(null\);/,
  `const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);

  const longPressProps = useLongPress((e: any) => {
    // Prevent default context menu on touch devices
    if (e.touches) e.preventDefault();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    setContextMenu({ x, y });
  });`);

fs.writeFileSync(filePath, content);
console.log('patched src/components/CalendarView.tsx again');
