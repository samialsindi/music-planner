import { ProjectEvent, Project } from './store';

export interface Clash {
  event1: ProjectEvent;
  event2: ProjectEvent;
  project1: Project;
  project2: Project;
  overlapMinutes: number;
}

import { EventTypeFilters } from './store';

export function detectClashes(
  projects: Project[],
  events: ProjectEvent[],
  eventTypeFilters?: EventTypeFilters
): Clash[] {
  // Only look at events that are:
  // 1. Individually toggled ON
  // 2. Belong to a project that is toggled ON
  const activeEventIds = new Set(
    events.filter(e => e.isToggled && (!eventTypeFilters || eventTypeFilters[e.type as keyof typeof eventTypeFilters])).map(e => e.id)
  );
  
  const activeProjectIds = new Set(
    projects.filter(p => p.isActive).map(p => p.id)
  );

  const activeEvents = events.filter(
    e => activeEventIds.has(e.id) && activeProjectIds.has(e.projectId)
  );

  const clashes: Clash[] = [];

  // Sort chronologically
  const sorted = [...activeEvents].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const e1 = sorted[i];
      const e2 = sorted[j];

      // Since sorted, if e2 starts >= e1 ends, no clash with e2 or any subsequent
      if (e2.startTime >= e1.endTime) {
        break; 
      }

      // Only flag clashes between DIFFERENT projects (same-project overlap is normal)
      if (e1.projectId === e2.projectId) continue;

      // We have a clash!
      const overlapStart = new Date(Math.max(e1.startTime.getTime(), e2.startTime.getTime()));
      const overlapEnd = new Date(Math.min(e1.endTime.getTime(), e2.endTime.getTime()));
      const overlapMinutes = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 60000);

      const p1 = projects.find(p => p.id === e1.projectId);
      const p2 = projects.find(p => p.id === e2.projectId);

      if (p1 && p2) {
        clashes.push({
          event1: e1,
          event2: e2,
          project1: p1,
          project2: p2,
          overlapMinutes
        });
      }
    }
  }

  return clashes;
}
