const fs = require('fs');

const path = 'src/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'const { addEvent, projects, events, toggleEvent, setProjects, setEvents } = useAppStore();',
  'const { addEvent, projects, orchestras, setOrchestras, setProjects, setEvents } = useAppStore();'
);

content = content.replace(
  '// Fetch projects',
  `// Fetch orchestras
      const { data: orchData, error: orchErr } = await supabase.from('orchestras').select('*');
      if (!orchErr && orchData) {
        const mappedOrchestras = orchData.map((o: any) => ({
          id: o.id,
          name: o.name,
          color: o.color,
          isActive: o.is_active
        }));
        setOrchestras(mappedOrchestras);
      }

      // Fetch projects`
);

content = content.replace(
  'id: p.id,',
  'id: p.id, orchestraId: p.orchestra_id,'
);

content = content.replace(
  'isToggled: e.is_toggled,',
  `isToggled: e.is_toggled,
          isAllDay: e.is_all_day || false,
          status: e.status || 'approved',`
);

content = content.replace(
  '[setProjects, setEvents]',
  '[setOrchestras, setProjects, setEvents]'
);

fs.writeFileSync(path, content, 'utf8');
