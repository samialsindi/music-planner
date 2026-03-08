const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'GanttView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/const \{ events, projects, eventTypeFilters, settings \} = useAppStore\(\);/,
  `const { events, projects, eventTypeFilters, settings, undoLastAction } = useAppStore();
  const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);`);

content = content.replace(/<div className="flex flex-col gap-4">/,
  `<div className="flex flex-col gap-4" onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); }} onClick={() => setContextMenu(null)}>`);

content = content.replace(/<\/div>\s*<\/>\s*\);\s*\}/,
  `{contextMenu && (
        <div
          className="fixed z-[9999] bg-gray-900 border border-white/10 rounded-lg shadow-xl py-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
            onClick={async () => {
              await undoLastAction();
              setContextMenu(null);
            }}
          >
            Undo Last Action
          </button>
        </div>
      )}
      </div>
    </>
  );
}`);

fs.writeFileSync(filePath, content);
console.log('patched src/components/GanttView.tsx with context menu');
