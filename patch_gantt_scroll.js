const fs = require('fs');

const path = 'src/components/GanttView.tsx';
let content = fs.readFileSync(path, 'utf8');

const search = `      // Auto-scroll to "Today" to clamp view left-alignment
      const scrollWrapper = document.querySelector('.gantt-scroll-wrapper') as HTMLElement;
      const todayLine = document.querySelector('.gantt .today-highlight');
      if (scrollWrapper && todayLine) {
        const xPos = parseFloat(todayLine.getAttribute('x') || '0');
        // Scroll so today is 20px from the left edge
        scrollWrapper.scrollLeft = Math.max(0, xPos - 20);
      }`;

const replace = `      // Auto-scroll to "Today" to clamp view left-alignment
      const scrollWrapper = document.querySelector('.gantt-scroll-wrapper') as HTMLElement;
      const todayLine = document.querySelector('.gantt .today-highlight');
      if (scrollWrapper && todayLine) {
        const xPos = parseFloat(todayLine.getAttribute('x') || '0');
        // Scroll so today is 20px from the left edge
        scrollWrapper.scrollLeft = Math.max(0, xPos - 20);
      }

      // Also scroll vertically to the first actual task bar (ignoring ghost/hidden tasks if needed)
      if (scrollWrapper) {
          const firstTaskRow = document.querySelector('.gantt .bar-wrapper');
          if (firstTaskRow) {
             const yPos = parseFloat(firstTaskRow.getAttribute('data-id') ? '0' : '0');
             // We just scroll to top for vertical since we filtered out empty projects.
             // But let's let sticky header handle it or just set scroll to 0 to be safe
             // actually just resetting scroll top to 0 is best
             scrollWrapper.scrollTop = 0;
          }
      }`;

if (content.includes(search)) {
    fs.writeFileSync(path, content.replace(search, replace));
    console.log("Patched successfully");
} else {
    console.log("Could not find text to replace");
}
