const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'CalendarView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const anchor = 'const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);';
content = content.replace(anchor, `${anchor}
  const longPressProps = useLongPress((e: any) => {
    if (e.touches) e.preventDefault();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    setContextMenu({ x, y });
  });`);

fs.writeFileSync(filePath, content);
