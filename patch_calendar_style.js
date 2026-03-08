const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarView.tsx', 'utf8');

const target = `    // Cross out target when user clicks a clash in Gantt View
    if (selectedClashEventId) {`;

const replacement = `    // If the event is marked "Can't Attend", strike it out visually
    if (event.resource && event.resource.isDeclined) {
      textDecoration = 'line-through';
      opacity = 0.4;
      backgroundColor = 'rgba(75, 85, 99, 0.4)'; // Gray out declined events
      borderColor = 'var(--clash-red)';
    }

    // Cross out target when user clicks a clash in Gantt View
    if (selectedClashEventId) {`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/components/CalendarView.tsx', code);
    console.log("Successfully patched eventStyleGetter in CalendarView.tsx to show isDeclined");
} else {
    console.log("Could not find exact text block to replace in CalendarView.tsx");
}
