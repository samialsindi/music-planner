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
  
  // Actions
  toggleOrchestra: (orchestraId: string) => void;
  toggleProject: (projectId: string) => void;
  toggleEventType: (eventType: keyof EventTypeFilters) => void;
  toggleEvent: (eventId: string) => void;
  addEvent: (event: ProjectEvent) => void;
  updateEvent: (event: ProjectEvent) => void;
  setOrchestras: (orchestras: Orchestra[]) => void;
  setProjects: (projects: Project[]) => void;
  setEvents: (events: ProjectEvent[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  orchestras: [],
  projects: [],
  events: [],
  eventTypeFilters: {
    rehearsal: true,
    concert: true,
    personal: true,
    other: true,
  },
  
  toggleEventType: (eventType) =>
    set((state) => ({
      eventTypeFilters: {
        ...state.eventTypeFilters,
        [eventType]: !state.eventTypeFilters[eventType],
      },
    })),

  toggleOrchestra: (orchestraId) =>
    set((state) => ({
      orchestras: state.orchestras.map((o) =>
        o.id === orchestraId ? { ...o, isActive: !o.isActive } : o
      ),
    })),

  toggleProject: (projectId) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, isActive: !p.isActive } : p
      ),
    })),
    
  toggleEvent: (eventId) =>
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId ? { ...e, isToggled: !e.isToggled } : e
      ),
    })),
    
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  updateEvent: (updatedEvent) => set((state) => ({
    events: state.events.map(e => e.id === updatedEvent.id ? updatedEvent : e)
  })),
  setOrchestras: (orchestras) => set({ orchestras }),
  setProjects: (projects) => set({ projects }),
  setEvents: (events) => set({ events }),
}));
