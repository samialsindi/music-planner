const fs = require('fs');
const path = require('path');

const filePaths = [
  'src/components/CalendarView.tsx',
  'src/components/GanttView.tsx',
  'src/components/ProjectToggles.tsx',
  'src/app/page.tsx'
];

filePaths.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Need to bring `settings` from `useAppStore()`
  if (content.includes('useAppStore();') && !content.includes('settings')) {
    content = content.replace(/const \{ ([^}]+) \} = useAppStore\(\);/g, 'const { $1, settings } = useAppStore();');
  }

  // Replace project.isActive with !settings.hiddenProjectIds.includes(project.id)
  content = content.replace(/\.isActive/g, ' && !settings.hiddenProjectIds.includes(p.id)');
  content = content.replace(/p\.isActive/g, '!settings.hiddenProjectIds.includes(p.id)');
  content = content.replace(/project\.isActive/g, '!settings.hiddenProjectIds.includes(project.id)');

  // Replace event.isToggled with !settings.hiddenEventIds.includes(event.id)
  content = content.replace(/\.isToggled/g, ' && !settings.hiddenEventIds.includes(e.id)');
  content = content.replace(/e\.isToggled/g, '!settings.hiddenEventIds.includes(e.id)');
  content = content.replace(/event\.isToggled/g, '!settings.hiddenEventIds.includes(event.id)');

  fs.writeFileSync(filePath, content);
  console.log(`Patched ${file}`);
});

// Since the above regexes might be slightly flawed, let's fix them manually for exact cases:
