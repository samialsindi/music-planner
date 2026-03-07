const fs = require('fs');

// Ensure the GanttView generated valid React
let ganttView = fs.readFileSync('src/components/GanttView.tsx', 'utf8');

ganttView = ganttView.replace(
    /return \(\s*<style jsx global>/m,
    `return (\n    <>\n      <style jsx global>`
).replace(
    /<div ref=\{ganttRef\} className="w-full"><\/div>\n      <\/div>\n    <\/div>\n  \);\n}/m,
    `<div ref={ganttRef} className="w-full"></div>\n      </div>\n    </div>\n    </>\n  );\n}`
);

fs.writeFileSync('src/components/GanttView.tsx', ganttView);
