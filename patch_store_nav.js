const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, 'src', 'lib', 'store.ts');
let content = fs.readFileSync(storePath, 'utf8');

// Add navigation state
content = content.replace(/selectedClashEventId: string \| null;/, `selectedClashEventId: string | null;
  calendarDate: Date;
  calendarView: 'month' | 'week' | 'day' | 'agenda';`);

content = content.replace(/setSettings: \(settings: UserSettings\) => void;/, `setSettings: (settings: UserSettings) => void;
  setCalendarDate: (date: Date) => void;
  setCalendarView: (view: 'month' | 'week' | 'day' | 'agenda') => void;`);

content = content.replace(/selectedClashEventId: null,/, `selectedClashEventId: null,
  calendarDate: new Date(),
  calendarView: 'month',`);

content = content.replace(/setSelectedClashEventId: \(id\) => set\(\{ selectedClashEventId: id \}\),/, `setSelectedClashEventId: (id) => set({ selectedClashEventId: id }),
  setCalendarDate: (date) => set({ calendarDate: date }),
  setCalendarView: (view) => set({ calendarView: view }),`);

fs.writeFileSync(storePath, content);
console.log('patched src/lib/store.ts for navigation');
