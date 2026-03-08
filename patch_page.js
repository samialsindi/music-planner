const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'src', 'app', 'page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

// We need to fetch the user_settings and initialize the store.
content = content.replace(/const \{ addEvent, projects, events, orchestras, setOrchestras, setProjects, setEvents \} = useAppStore\(\);/, `const { addEvent, projects, events, orchestras, setOrchestras, setProjects, setEvents, setSettings } = useAppStore();`);

content = content.replace(/useEffect\(\(\) => \{[\s\S]*?async function fetchData\(\) \{/, `useEffect(() => {
    async function fetchData() {
      // Fetch user settings
      const { data: settingsData, error: settingsErr } = await supabase.from('user_settings').select('*').eq('id', 1).maybeSingle();
      if (!settingsErr && settingsData) {
        setSettings({
          hiddenProjectIds: settingsData.hidden_project_ids || [],
          hiddenEventIds: settingsData.hidden_event_ids || [],
          eventTypeFilters: settingsData.event_type_filters || { rehearsal: true, concert: true, personal: true, other: true }
        });
      }
`);

fs.writeFileSync(pagePath, content);
console.log('patched src/app/page.tsx');
