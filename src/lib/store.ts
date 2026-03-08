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

export interface EventTypeFilters {
  rehearsal: boolean;
  concert: boolean;
  personal: boolean;
  other: boolean;
}

interface AppState {
  eventTypeFilters: EventTypeFilters;
  orchestras: Orchestra[];
  projects: Project[];
  events: ProjectEvent[];
  selectedClashEventId: string | null;
  
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
}

const isBrowser = typeof window !== 'undefined';
const getInitialFilters = (): EventTypeFilters => {
  if (isBrowser) {
    const saved = localStorage.getItem('music-planner-filters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore JSON parse error
      }
    }
  }
  return {
    rehearsal: true,
    concert: true,
    personal: true,
    other: true,
  };
};

export const useAppStore = create<AppState>((set, get) => ({
  orchestras: [],
  projects: [],
  events: [],
  selectedClashEventId: null,
  eventTypeFilters: getInitialFilters(),
  
  setSelectedClashEventId: (id) => set({ selectedClashEventId: id }),
  
  toggleEventType: (eventType) => {
    set((state) => {
      const newFilters = {
        ...state.eventTypeFilters,
        [eventType]: !state.eventTypeFilters[eventType],
      };
      if (isBrowser) {
        localStorage.setItem('music-planner-filters', JSON.stringify(newFilters));
      }
      return { eventTypeFilters: newFilters };
    });
  },

  toggleOrchestra: (orchestraId) =>
    set((state) => ({
      orchestras: state.orchestras.map((o) =>
        o.id === orchestraId ? { ...o, isActive: !o.isActive } : o
      ),
    })),

  toggleProject: async (projectId) => {
    // 1. Optimistic local update
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, isActive: !p.isActive } : p
      ),
    }));

    // 2. Persist to Supabase
    const { projects } = useAppStore.getState();
    const toggledProject = projects.find(p => p.id === projectId);
    if (toggledProject) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        await supabase
          .from('projects')
          .update({ is_active: toggledProject.isActive })
          .eq('id', projectId);
      }
    }
  },
    
  toggleEvent: async (eventId) => {
    // 1. Optimistic local update
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId ? { ...e, isToggled: !e.isToggled } : e
      ),
    }));

    // 2. Persist to Supabase
    const { events } = useAppStore.getState();
    const toggledEvent = events.find(e => e.id === eventId);
    if (toggledEvent) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        await supabase
          .from('events')
          .update({ is_toggled: toggledEvent.isToggled })
          .eq('id', eventId);
      }
    }
  },
    
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  updateEvent: (updatedEvent) => set((state) => ({
    events: state.events.map(e => e.id === updatedEvent.id ? updatedEvent : e)
  })),
  setOrchestras: (orchestras) => set({ orchestras }),
  setProjects: (projects) => set({ projects }),
  setEvents: (events) => set({ events }),
}));
