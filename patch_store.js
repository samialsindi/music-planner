const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, 'src', 'lib', 'store.ts');
let content = fs.readFileSync(storePath, 'utf8');

// The toggleEventType is currently duplicated or broken, let's fix it properly.
// Remove the existing `toggleEventType` (the broken one that writes to localStorage)
content = content.replace(/toggleEventType: \(eventType\) => \{[\s\S]*?return \{ eventTypeFilters: newFilters \};\s*\};\s*\},\s*/g, '');

content = content.replace(/setSelectedClashEventId: \(id\) => set\(\{ selectedClashEventId: id \}\),/, `setSelectedClashEventId: (id) => set({ selectedClashEventId: id }),

  toggleEventType: async (eventType) => {
    const { settings } = get();
    const newFilters = { ...settings.eventTypeFilters, [eventType]: !settings.eventTypeFilters[eventType] };
    const newSettings = { ...settings, eventTypeFilters: newFilters };
    set({ settings: newSettings });

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
    await supabase.from('user_settings').update({ event_type_filters: newFilters }).eq('id', 1);
  },
`);

fs.writeFileSync(storePath, content);
console.log('patched src/lib/store.ts');
