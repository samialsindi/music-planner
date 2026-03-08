const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, 'src', 'lib', 'store.ts');
let content = fs.readFileSync(storePath, 'utf8');

// Add undo handler to the store
content = content.replace(/setSettings: \(settings: UserSettings\) => void;/, `setSettings: (settings: UserSettings) => void;
  undoLastAction: () => Promise<void>;`);

content = content.replace(/toggleProject: async \(projectId\) => \{/, `toggleProject: async (projectId) => {
    const { settings } = get();
    const isCurrentlyHidden = settings.hiddenProjectIds.includes(projectId);

    // Audit Log Entry
    const { logAction } = await import('./audit');
    await logAction('TOGGLE_PROJECT', projectId, { isHidden: isCurrentlyHidden }, { isHidden: !isCurrentlyHidden });
`);

content = content.replace(/toggleEvent: async \(eventId\) => \{/, `toggleEvent: async (eventId) => {
    const { settings } = get();
    const isCurrentlyHidden = settings.hiddenEventIds.includes(eventId);

    // Audit Log Entry
    const { logAction } = await import('./audit');
    await logAction('TOGGLE_EVENT', eventId, { isHidden: isCurrentlyHidden }, { isHidden: !isCurrentlyHidden });
`);

content = content.replace(/updateEvent: \(updatedEvent\) => set\(\(state\) => \(\{\s*events: state\.events\.map\(e => e\.id === updatedEvent\.id \? updatedEvent : e\)\s*\}\)\),/, `updateEvent: async (updatedEvent) => {
    const { events } = get();
    const oldEvent = events.find(e => e.id === updatedEvent.id);
    if (oldEvent) {
      const { logAction } = await import('./audit');
      await logAction('UPDATE_EVENT', updatedEvent.id, oldEvent, updatedEvent);
    }
    set((state) => ({ events: state.events.map(e => e.id === updatedEvent.id ? updatedEvent : e) }));
  },`);

// Need to define undoLastAction in the Zustand create block, before the final `}));`
content = content.replace(/setEvents: \(events\) => set\(\{ events \}\),\s*\}\)\);/, `setEvents: (events) => set({ events }),
  undoLastAction: async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('reverted', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.log('No actions to undo');
      return;
    }

    const log = data;

    // Revert logic
    if (log.action_type === 'TOGGLE_PROJECT') {
      const { settings, setSettings } = get();
      const prevIsHidden = log.previous_state.isHidden;
      const newHiddenIds = prevIsHidden
        ? [...settings.hiddenProjectIds, log.entity_id]
        : settings.hiddenProjectIds.filter(id => id !== log.entity_id);

      setSettings({ ...settings, hiddenProjectIds: newHiddenIds });
      await supabase.from('user_settings').update({ hidden_project_ids: newHiddenIds }).eq('id', 1);

    } else if (log.action_type === 'TOGGLE_EVENT') {
      const { settings, setSettings } = get();
      const prevIsHidden = log.previous_state.isHidden;
      const newHiddenIds = prevIsHidden
        ? [...settings.hiddenEventIds, log.entity_id]
        : settings.hiddenEventIds.filter(id => id !== log.entity_id);

      setSettings({ ...settings, hiddenEventIds: newHiddenIds });
      await supabase.from('user_settings').update({ hidden_event_ids: newHiddenIds }).eq('id', 1);

    } else if (log.action_type === 'UPDATE_EVENT') {
      const prevEvent = log.previous_state;
      // Revert in local state
      set((state) => ({
        events: state.events.map(e => e.id === log.entity_id ? prevEvent : e)
      }));
      // Revert in DB
      await supabase.from('events').update({
        title: prevEvent.title,
        project_id: prevEvent.projectId,
        start_time: prevEvent.startTime,
        end_time: prevEvent.endTime
      }).eq('id', log.entity_id);
    }

    // Mark reverted
    await supabase.from('audit_log').update({ reverted: true }).eq('id', log.id);
  }
}));`);

fs.writeFileSync(storePath, content);
console.log('patched src/lib/store.ts undo logic');
