const fs = require('fs');
const file = 'src/components/ProjectToggles.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `  const { projects, events, toggleProject, toggleEvent, eventTypeFilters, toggleEventType, settings } = useAppStore();`;
const replacement1 = `  const { projects, events, toggleProject, toggleEvent, eventTypeFilters, toggleEventType, settings, orchestras } = useAppStore();`;

content = content.replace(target1, replacement1);

const target2 = `              <div className="flex items-center justify-between mb-4 pl-8 pr-2">
                <h4 className="font-bold text-lg text-white pr-4">{project.name}</h4>`;
const replacement2 = `              <div className="flex items-center justify-between mb-4 pl-8 pr-2">
                <h4 className="font-bold text-lg text-white pr-4">
                  {orchestras.find(o => o.id === project.orchestraId)?.name} / {project.name}
                </h4>`;

if (content.includes(target2)) {
  content = content.replace(target2, replacement2);
  fs.writeFileSync(file, content);
  console.log('Successfully updated ProjectToggles.tsx');
} else {
  console.log('Target string not found in ProjectToggles.tsx');
}
