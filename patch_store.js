const fs = require('fs');

const path = 'src/lib/store.ts';
let code = fs.readFileSync(path, 'utf8');

// Add helper to check valid duration (more than 30 mins)
const helperCode = `
export const isEventValidDuration = (event: ProjectEvent): boolean => {
  if (!event || !event.startTime || !event.endTime) return false;
  const durationMs = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
  return durationMs > 30 * 60 * 1000;
};

interface AppState {
`;

code = code.replace('interface AppState {', helperCode);

// Modify setEvents to filter out short events
code = code.replace(
  'setEvents: (events) => set({ events }),',
  'setEvents: (events) => set({ events: events.filter(isEventValidDuration) }),'
);

// Modify addEvent to only add valid events
code = code.replace(
  'addEvent: (event) => set((state) => ({ events: [...state.events, event] })),',
  'addEvent: (event) => set((state) => ({ events: isEventValidDuration(event) ? [...state.events, event] : state.events })),'
);

// Modify updateEvent to either update if still valid, or remove if no longer valid
const updateEventBefore = `
    set((state) => ({ events: state.events.map(e => e.id === updatedEvent.id ? updatedEvent : e) }));
  },
`;

const updateEventAfter = `
    set((state) => {
      if (isEventValidDuration(updatedEvent)) {
        return { events: state.events.map(e => e.id === updatedEvent.id ? updatedEvent : e) };
      } else {
        return { events: state.events.filter(e => e.id !== updatedEvent.id) };
      }
    });
  },
`;

code = code.replace(updateEventBefore, updateEventAfter);

// Since updateEvent might also undo... actually undo logic is inside undoLastAction, which we might also want to fix, but let's stick to updateEvent for now.
const undoUpdateEventBefore = `
      // Revert in local state
      set((state) => ({
        events: state.events.map(e => e.id === log.entity_id ? prevEvent : e)
      }));
`;

const undoUpdateEventAfter = `
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
`;

code = code.replace(undoUpdateEventBefore, undoUpdateEventAfter);


fs.writeFileSync(path, code);
console.log('patched store.ts');
