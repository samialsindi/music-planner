const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'GanttView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update scroll handling logic to fix mobile issues.
// 1. Mobile often uses `requestAnimationFrame` for smoother scroll updates since events might fire asynchronously.
// 2. SVG transform needs to handle the container correctly.

content = content.replace(/const handleScroll = \(\) => \{[\s\S]*? \};\s*\};\s*if \(\(scrollWrapper as any\)\._stickyScrollHandler\)/,
`const handleScroll = () => {
    requestAnimationFrame(() => {
        const svgGroup = document.querySelector('.sticky-header-group') as SVGGElement;
        if (svgGroup && scrollWrapper) {
            svgGroup.setAttribute('transform', \`translate(0, \${scrollWrapper.scrollTop})\`);
        }
    });
};

// Also listen to touchmove to enforce smooth updates during finger dragging
if ((scrollWrapper as any)._stickyScrollHandler) {
    scrollWrapper.removeEventListener('scroll', (scrollWrapper as any)._stickyScrollHandler);
    scrollWrapper.removeEventListener('touchmove', (scrollWrapper as any)._stickyScrollHandler);
}
(scrollWrapper as any)._stickyScrollHandler = handleScroll;
scrollWrapper.addEventListener('scroll', handleScroll, { passive: true });
scrollWrapper.addEventListener('touchmove', handleScroll, { passive: true });
`);

fs.writeFileSync(filePath, content);
console.log('patched src/components/GanttView.tsx for mobile sticky header');
