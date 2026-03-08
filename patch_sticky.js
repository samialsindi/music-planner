const fs = require('fs');

const path = 'src/components/GanttView.tsx';
let content = fs.readFileSync(path, 'utf8');

const search = `      // Implement Freeze-Pane Sticky Header
      const svg = document.querySelector('.gantt svg');
      if (svg && scrollWrapper) {
          let stickyGroup = svg.querySelector('.sticky-header-group') as SVGGElement;
          if (!stickyGroup) {
              stickyGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              stickyGroup.setAttribute('class', 'sticky-header-group');
              svg.appendChild(stickyGroup); // Append to very end so it has highest Z-index over bars

              // Add the semi-transparent black header background
              const gridHeaderBg = document.querySelector('.gantt .grid-header');
              if (gridHeaderBg) {
                  stickyGroup.appendChild(gridHeaderBg);
              }

              // Extract all text labels from the ticks and copy them into the sticky group
              const ticks = document.querySelectorAll('.gantt .tick');
              ticks.forEach(tick => {
                  const upper = tick.querySelector('.upper-text');
                  const lower = tick.querySelector('.lower-text');
                  const transform = tick.getAttribute('transform');

                  if (upper) {
                      const clonedUpper = upper.cloneNode(true) as SVGTextElement;
                      if (transform) clonedUpper.setAttribute('transform', transform);
                      stickyGroup.appendChild(clonedUpper);
                      upper.setAttribute('visibility', 'hidden');
                  }
                  if (lower) {
                      const clonedLower = lower.cloneNode(true) as SVGTextElement;
                      if (transform) clonedLower.setAttribute('transform', transform);
                      stickyGroup.appendChild(clonedLower);
                      lower.setAttribute('visibility', 'hidden');
                  }
              });
          }

          // Attach scroll sync listener
          const handleScroll = () => {
             if (stickyGroup) {
                // translate down according to vertical scroll
                stickyGroup.style.transform = \`translateY(\${scrollWrapper.scrollTop}px)\`;
             }
          };
          scrollWrapper.addEventListener('scroll', handleScroll);

          // Trigger once immediately
          handleScroll();
      }`;

const replace = `      // Implement Freeze-Pane Sticky Header
      const svg = document.querySelector('.gantt svg');
      if (svg && scrollWrapper) {
          let stickyGroup = svg.querySelector('.sticky-header-group') as SVGGElement;

          // Remove old sticky group if it exists to cleanly recreate it (especially on re-renders/view changes)
          if (stickyGroup) {
             stickyGroup.remove();
          }

          stickyGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          stickyGroup.setAttribute('class', 'sticky-header-group');
          // Important for z-index in SVG is just DOM order, so append last.
          svg.appendChild(stickyGroup);

          // Create a solid background rect for the sticky header
          const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          bgRect.setAttribute('x', '0');
          bgRect.setAttribute('y', '0');
          bgRect.setAttribute('width', svg.getAttribute('width') || '10000');

          // The grid-header class usually defines height, we'll try to find it or fallback
          const gridHeaderBg = document.querySelector('.gantt .grid-header');
          let headerHeight = '60';
          if (gridHeaderBg) {
             headerHeight = gridHeaderBg.getAttribute('height') || '60';
             // Hide the original so it doesn't peak through
             gridHeaderBg.setAttribute('fill-opacity', '0');
          }

          bgRect.setAttribute('height', headerHeight);
          // Assuming dark theme from your app, match the header background color
          bgRect.setAttribute('fill', '#111827'); // Tailwind gray-900 or use var(--bg-color)
          bgRect.setAttribute('opacity', '1');
          stickyGroup.appendChild(bgRect);

          // Add a bottom border line to the sticky header
          const borderLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          borderLine.setAttribute('x1', '0');
          borderLine.setAttribute('y1', headerHeight);
          borderLine.setAttribute('x2', svg.getAttribute('width') || '10000');
          borderLine.setAttribute('y2', headerHeight);
          borderLine.setAttribute('stroke', 'rgba(255,255,255,0.1)');
          borderLine.setAttribute('stroke-width', '1');
          stickyGroup.appendChild(borderLine);

          // Extract all text labels from the ticks and copy them into the sticky group
          const ticks = document.querySelectorAll('.gantt .tick');
          ticks.forEach(tick => {
              const upper = tick.querySelector('.upper-text');
              const lower = tick.querySelector('.lower-text');
              const transform = tick.getAttribute('transform');
              const tickLine = tick.querySelector('line');

              if (upper) {
                  const clonedUpper = upper.cloneNode(true) as SVGTextElement;
                  if (transform) clonedUpper.setAttribute('transform', transform);
                  stickyGroup.appendChild(clonedUpper);
              }
              if (lower) {
                  const clonedLower = lower.cloneNode(true) as SVGTextElement;
                  if (transform) clonedLower.setAttribute('transform', transform);
                  stickyGroup.appendChild(clonedLower);
              }
              // Clone the little tick lines too if they exist
              if (tickLine && tickLine.getAttribute('class') !== 'tick-line-grid') {
                  const clonedTickLine = tickLine.cloneNode(true) as SVGLineElement;
                  if (transform) clonedTickLine.setAttribute('transform', transform);
                  // Ensure it's drawn on top
                  stickyGroup.appendChild(clonedTickLine);
              }
          });

          // Define the scroll handler
          const handleScroll = () => {
             const svgGroup = document.querySelector('.sticky-header-group') as SVGGElement;
             if (svgGroup && scrollWrapper) {
                // translateY needs to be an exact translation on the Y axis matching scrollTop
                svgGroup.setAttribute('transform', \`translate(0, \${scrollWrapper.scrollTop})\`);
             }
          };

          // Remove any old scroll listeners to avoid memory leaks or duplicate handlers
          // An easy hack is to replace the wrapper with a clone, but that breaks react.
          // Since it's inside a useEffect, we can just assign an ID or property to store the current handler.
          if ((scrollWrapper as any)._stickyScrollHandler) {
             scrollWrapper.removeEventListener('scroll', (scrollWrapper as any)._stickyScrollHandler);
          }
          (scrollWrapper as any)._stickyScrollHandler = handleScroll;
          scrollWrapper.addEventListener('scroll', handleScroll);

          // Trigger once immediately
          handleScroll();
      }`;

if (content.includes(search)) {
    fs.writeFileSync(path, content.replace(search, replace));
    console.log("Patched successfully");
} else {
    console.log("Could not find text to replace");
}
