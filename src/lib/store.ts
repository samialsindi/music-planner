import { create } from 'zustand';

export type EventType = 'rehearsal' | 'concert' | 'other';
export type EventSource = 'manual' | 'gcal' | 'email';

export interface ProjectEvent {
  id: string;
  projectId: string;
  title: string;
  type: EventType;
  startTime: Date;
  endTime: Date;
  source: EventSource;
  externalId?: string;
  isToggled: boolean; // For granular hide/show
  inferredInstrumentation?: {
    timpaniRequired: boolean;
    percussionRequired: boolean;
    notes: string;
  };
}

export interface Project {
  id: string;
  name: string;
  color: string;
  isActive: boolean; // High level toggle
}

interface AppState {
  projects: Project[];
  events: ProjectEvent[];
  
  // Actions
  toggleProject: (projectId: string) => void;
  toggleEvent: (eventId: string) => void;
  addEvent: (event: ProjectEvent) => void;
  setProjects: (projects: Project[]) => void;
  setEvents: (events: ProjectEvent[]) => void;
}

// Temporary Mock Data
const mockProjects: Project[] = [
  { id: '1', name: 'Beethoven Symphony No. 9', color: '#6b21a8', isActive: true },
  { id: '2', name: 'Mozart Requiem', color: '#e11d48', isActive: true },
];

const mockEvents: ProjectEvent[] = [
  {
    id: 'e1',
    projectId: '1',
    title: 'Tutti Rehearsal',
    type: 'rehearsal',
    startTime: new Date(new Date().setHours(19, 0, 0, 0)), // Today 7pm
    endTime: new Date(new Date().setHours(22, 0, 0, 0)), // Today 10pm
    source: 'manual',
    isToggled: true,
    inferredInstrumentation: {
      timpaniRequired: true,
      percussionRequired: true,
      notes: 'Full orchestration expected.',
    }
  },
  {
    id: 'e2',
    projectId: '2',
    title: 'Chorus Only (A Cappella focus)',
    type: 'rehearsal',
    startTime: new Date(new Date().setHours(20, 0, 0, 0)), // Today 8pm (CLASH)
    endTime: new Date(new Date().setHours(21, 30, 0, 0)), // Today 9:30pm
    source: 'email',
    isToggled: true, // If user turns this off, the clash goes away!
    inferredInstrumentation: {
      timpaniRequired: false,
      percussionRequired: false,
      notes: 'Inferred NO percussion needed based on "Chorus Only" text.',
    }
  }
]

export const useAppStore = create<AppState>((set) => ({
  projects: mockProjects,
  events: mockEvents,
  
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
  setProjects: (projects) => set({ projects }),
  setEvents: (events) => set({ events }),
}));
