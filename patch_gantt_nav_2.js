const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'GanttView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The initialization has `on_click: function (task: any) {`
content = content.replace(/on_click: function \(task: any\) \{/,
`on_click: function (task: any) {
          const state = useAppStore.getState();
          const clickedEvent = state.events.find(e => e.id === task.id);
          if (clickedEvent) {
             state.setCalendarDate(new Date(clickedEvent.startTime));
             state.setCalendarView('week');
          }`);

fs.writeFileSync(filePath, content);
console.log('patched src/components/GanttView.tsx with click handler');
