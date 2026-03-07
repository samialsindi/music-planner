const fs = require('fs');

// Patch globals.css to ensure frappe-gantt is properly styled for dark mode
let css = fs.readFileSync('src/app/globals.css', 'utf8');

// The original CSS lacked `custom-gantt-theme` specific scoping for the gantt overrides
const ganttCss = `
/* Custom Gantt Theme Enforcements */
.custom-gantt-theme .gantt .grid-header {
  fill: var(--background);
  stroke: var(--glass-border);
}
.custom-gantt-theme .gantt .grid-row {
  fill: var(--background);
}
.custom-gantt-theme .gantt .grid-row:nth-child(even) {
  fill: rgba(255, 255, 255, 0.05);
}
.custom-gantt-theme .gantt .tick {
  stroke: var(--glass-border);
}
.custom-gantt-theme .gantt .upper-text,
.custom-gantt-theme .gantt .lower-text {
  fill: #a8a2b5;
}
.custom-gantt-theme .gantt .bar-wrapper .bar {
  fill: var(--accent);
}
.custom-gantt-theme .gantt .bar-wrapper .bar-progress {
  fill: var(--accent-light);
}
.custom-gantt-theme .gantt .bar-wrapper .bar-label {
  fill: #fff;
}
.custom-gantt-theme .gantt .grid-background {
  fill: var(--background);
}
`;

if (!css.includes('.custom-gantt-theme .gantt')) {
  css += ganttCss;
  fs.writeFileSync('src/app/globals.css', css);
}

// Ensure the GanttView generates dynamic styles for project colors
let ganttView = fs.readFileSync('src/components/GanttView.tsx', 'utf8');

if (!ganttView.includes('<style jsx global>')) {
  // Inject the style block before the return div
  ganttView = ganttView.replace(
    '<div className="flex flex-col gap-4">',
    `
      <style jsx global>{\`
        \${projects.map(p => \`
          .gantt-proj-\${p.id} .bar { fill: \${p.color} !important; opacity: 0.8; }
          .gantt-proj-\${p.id} .bar-progress { fill: \${p.color} !important; opacity: 1; }
        \`).join('')}
      \`}</style>
      <div className="flex flex-col gap-4">
    `
  );
  fs.writeFileSync('src/components/GanttView.tsx', ganttView);
}
