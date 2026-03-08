const fs = require('fs');

const path = 'src/components/GanttView.tsx';
let content = fs.readFileSync(path, 'utf8');

const search = `    const tasks = activeProjects.map(project => {
      // Get ALL events for this project to accurately draw the project timespan
      const allProjectEvents = events.filter(
        e => e.projectId === project.id && e.isToggled
      );

      let start = moment().format('YYYY-MM-DD');
      let end = moment().add(1, 'month').format('YYYY-MM-DD');

      if (allProjectEvents.length > 0) {
        allProjectEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        const actualStart = moment(allProjectEvents[0].startTime);
        start = (actualStart.isBefore(today) ? today : actualStart).format('YYYY-MM-DD');
        end = moment(allProjectEvents[allProjectEvents.length - 1].endTime).format('YYYY-MM-DD');
      }

      return {
        id: project.id,
        name: project.name,
        start,
        end,
        progress: 0,
        custom_class: \`gantt-proj-\${project.id}\`, // We can target this in CSS for colors
      };
    });`;

const replace = `    const tasks = activeProjects.map(project => {
      // Get ALL events for this project to accurately draw the project timespan
      const allProjectEvents = events.filter(
        e => e.projectId === project.id && e.isToggled
      );

      return {
        id: project.id,
        name: project.name,
        events: allProjectEvents
      };
    })
    .filter(project => project.events.length > 0) // Hide projects with no events completely
    .map(project => {
      const allProjectEvents = project.events;
      allProjectEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      const actualStart = moment(allProjectEvents[0].startTime);
      const start = (actualStart.isBefore(today) ? today : actualStart).format('YYYY-MM-DD');
      const end = moment(allProjectEvents[allProjectEvents.length - 1].endTime).format('YYYY-MM-DD');

      return {
        id: project.id,
        name: project.name,
        start,
        end,
        progress: 0,
        custom_class: \`gantt-proj-\${project.id}\`, // We can target this in CSS for colors
      };
    });`;

if (content.includes(search)) {
    fs.writeFileSync(path, content.replace(search, replace));
    console.log("Patched successfully");
} else {
    console.log("Could not find text to replace");
}
