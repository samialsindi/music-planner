const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'CalendarView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The store now handles audit logging for updateEvent, so we just need to ensure Calendar calls updateEvent.
// CalendarView.tsx already does: useAppStore.getState().updateEvent(updated);
// So the audit log will be generated.
// We also need to add a global context menu or right-click to CalendarView for the Undo option.

content = content.replace(/const \{ events, projects, toggleEvent, eventTypeFilters, toggleEventType, selectedClashEventId, setSelectedClashEventId, settings \} = useAppStore\(\);/,
  `const { events, projects, toggleEvent, eventTypeFilters, toggleEventType, selectedClashEventId, setSelectedClashEventId, settings, undoLastAction } = useAppStore();
  const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);`);

// Add context menu handler to Calendar container
content = content.replace(/<div className="flex flex-col gap-4">/,
  `<div className="flex flex-col gap-4" onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); }} onClick={() => setContextMenu(null)}>`);

// Add context menu component
content = content.replace(/\{editingEvent && \(/,
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

      {editingEvent && (`);

fs.writeFileSync(filePath, content);
console.log('patched src/components/CalendarView.tsx with context menu');
