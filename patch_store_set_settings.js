const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'lib', 'store.ts');
let content = fs.readFileSync(filePath, 'utf8');

// I might have accidentally overwritten `setSettings: (settings) => set({ settings }),` when I patched store navigation/undo.
if (!content.includes('setSettings: (settings) => set({ settings }),')) {
  content = content.replace(/setCalendarView: \(view\) => set\(\{ calendarView: view \}\),/, `setCalendarView: (view) => set({ calendarView: view }),
  setSettings: (settings) => set({ settings }),`);
}

fs.writeFileSync(filePath, content);
