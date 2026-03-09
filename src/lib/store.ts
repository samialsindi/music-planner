import { create } from 'zustand';

export type EventType = 'rehearsal' | 'concert' | 'personal' | 'other';
export type EventSource = 'manual' | 'gcal' | 'email' | 'freeform';
export type EventStatus = 'pending' | 'approved';

export interface ProjectEvent {
  id: string;
  projectId: string;
  title: string;
  type: EventType;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  status: EventStatus;
  source: EventSource;
  externalId?: string;
  isToggled: boolean; // For granular hide/show
  isDeclined?: boolean; // Cross out "can't attend"
  inferredInstrumentation?: {
    timpaniRequired: boolean;
    percussionRequired: boolean;
    notes: string;
  };
}

export interface Orchestra {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
}

export interface Project {
  id: string;
  orchestraId: string;
  name: string;
  color: string;
  isActive: boolean; // High level toggle
}

export interface UserSettings {
  hiddenProjectIds: string[];
  hiddenEventIds: string[];
  eventTypeFilters: EventTypeFilters;
}

export interface EventTypeFilters {
  rehearsal: boolean;
  concert: boolean;
  personal: boolean;
  other: boolean;
}


export const isEventValidDuration = (event: ProjectEvent): boolean => {
  if (!event || !event.startTime || !event.endTime) return false;
  if (event.isAllDay) return true;
  const durationMs = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
  return durationMs > 30 * 60 * 1000;
};

interface AppState {

  settings: UserSettings;
  eventTypeFilters: EventTypeFilters;
  orchestras: Orchestra[];
  projects: Project[];
  events: ProjectEvent[];
  selectedClashEventId: string | null;
  calendarDate: Date;
  calendarView: 'month' | 'week' | 'day' | 'agenda';
  
  // Actions
  setSelectedClashEventId: (id: string | null) => void;
  toggleOrchestra: (orchestraId: string) => void;
  toggleProject: (projectId: string) => Promise<void>;
  toggleEventType: (eventType: keyof EventTypeFilters) => void;
  toggleEvent: (eventId: string) => Promise<void>;
  addEvent: (event: ProjectEvent) => void;
  updateEvent: (event: ProjectEvent) => void;
  setOrchestras: (orchestras: Orchestra[]) => void;
  setProjects: (projects: Project[]) => void;
  setEvents: (events: ProjectEvent[]) => void;
  setSettings: (settings: UserSettings) => void;
  setCalendarDate: (date: Date) => void;
  setCalendarView: (view: 'month' | 'week' | 'day' | 'agenda') => void;
  undoLastAction: () => Promise<void>;
}

const isBrowser = typeof window !== 'undefined';
const defaultSettings: UserSettings = {
  hiddenProjectIds: [],
  hiddenEventIds: [],
  eventTypeFilters: { rehearsal: true, concert: true, personal: true, other: true }
};
export const useAppStore = create<AppState>((set, get) => ({
  orchestras: [],
  projects: [],
  events: [],
  selectedClashEventId: null,
  calendarDate: new Date(),
  calendarView: 'month',
  settings: defaultSettings,
  get eventTypeFilters() { return get().settings.eventTypeFilters; },
  
  setSelectedClashEventId: (id) => set({ selectedClashEventId: id }),
  setCalendarDate: (date) => set({ calendarDate: date }),
  setCalendarView: (view) => set({ calendarView: view }),
  setSettings: (settings) => set({ settings }),
  
  toggleEventType: async (eventType) => {
    const { settings } = get();
    const newFilters = { ...settings.eventTypeFilters, [eventType]: !settings.eventTypeFilters[eventType] };
    const newSettings = { ...settings, eventTypeFilters: newFilters };
    set({ settings: newSettings });

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
    await supabase.from('user_settings').update({ event_type_filters: newFilters }).eq('id', 1);
  },




  toggleOrchestra: (orchestraId) =>
    set((state) => ({
      orchestras: state.orchestras.map((o) =>
        o.id === orchestraId ? { ...o, isActive: !o.isActive } : o
      ),
    })),

  toggleProject: async (projectId) => {
    const { settings } = get();
    const isCurrentlyHidden = settings.hiddenProjectIds.includes(projectId);

    // Audit Log Entry
    const { logAction } = await import('./audit');
    await logAction('TOGGLE_PROJECT', projectId, { isHidden: isCurrentlyHidden }, { isHidden: !isCurrentlyHidden });

    const newHiddenIds = isCurrentlyHidden
      ? settings.hiddenProjectIds.filter(id => id !== projectId)
      : [...settings.hiddenProjectIds, projectId];

    set({ settings: { ...settings, hiddenProjectIds: newHiddenIds } });

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
    await supabase.from('user_settings').update({ hidden_project_ids: newHiddenIds }).eq('id', 1);
  },
toggleEvent: async (eventId) => {
    const { settings } = get();
    const isCurrentlyHidden = settings.hiddenEventIds.includes(eventId);
    
    // Audit Log Entry
    const { logAction } = await import('./audit');
    await logAction('TOGGLE_EVENT', eventId, { isHidden: isCurrentlyHidden }, { isHidden: !isCurrentlyHidden });

    const newHiddenIds = isCurrentlyHidden
      ? settings.hiddenEventIds.filter(id => id !== eventId)
      : [...settings.hiddenEventIds, eventId];

    set({ settings: { ...settings, hiddenEventIds: newHiddenIds } });

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
    await supabase.from('user_settings').update({ hidden_event_ids: newHiddenIds }).eq('id', 1);
  },
addEvent: (event) => set((state) => ({ events: isEventValidDuration(event) ? [...state.events, event] : state.events })),
  updateEvent: async (updatedEvent) => {
    const { events } = get();
    const oldEvent = events.find(e => e.id === updatedEvent.id);
    if (oldEvent) {
      const { logAction } = await import('./audit');
      await logAction('UPDATE_EVENT', updatedEvent.id, oldEvent, updatedEvent);
    }
    set((state) => {
      if (isEventValidDuration(updatedEvent)) {
        return { events: state.events.map(e => e.id === updatedEvent.id ? updatedEvent : e) };
      } else {
        return { events: state.events.filter(e => e.id !== updatedEvent.id) };
      }
    });
  },
  setOrchestras: (orchestras) => set({ orchestras }),
  setProjects: (projects) => set({ projects }),
  setEvents: (events) => set({ events: events.filter(isEventValidDuration) }),
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
      set((state) => {
        if (isEventValidDuration(prevEvent)) {
          // It might not exist in the state if it was removed for being too short when updated
          const exists = state.events.some(e => e.id === log.entity_id);
          if (exists) {
            return { events: state.events.map(e => e.id === log.entity_id ? prevEvent : e) };
          } else {
            return { events: [...state.events, prevEvent] };
          }
        } else {
          return { events: state.events.filter(e => e.id !== log.entity_id) };
        }
      });
      // Revert in DB
      await supabase.from('events').update({
        title: prevEvent.title,
        project_id: prevEvent.projectId,
        start_time: prevEvent.startTime,
        end_time: prevEvent.endTime,
        is_declined: prevEvent.isDeclined
      }).eq('id', log.entity_id);
    }

    // Mark reverted
    await supabase.from('audit_log').update({ reverted: true }).eq('id', log.id);
  }
}));
