'use client';
import { useAppStore } from '@/lib/store';
import moment from 'moment';
import ProjectToggles from '@/components/ProjectToggles';

export default function HiddenPage() {
  const { events, projects, settings, toggleProject, toggleEvent } = useAppStore();

  const handleUnhideEvent = (eventId: string, isFromHiddenProject: boolean, projectId: string) => {
    if (isFromHiddenProject) {
      // Approach A: Unhide the project, but hide all other events in that project
      const projectEvents = events.filter(e => e && e.projectId === projectId);

      // 1. Unhide project (removes it from hiddenProjectIds)
      toggleProject(projectId);

      // 2. Hide all OTHER events in the project individually
      projectEvents.forEach(e => {
        if (e.id !== eventId && !settings.hiddenEventIds.includes(e.id)) {
          toggleEvent(e.id);
        }
      });
    } else {
      // It's an individually hidden event, just unhide it
      toggleEvent(eventId);
    }
  };

  const handleUnhideProject = (projectId: string) => {
      toggleProject(projectId);
  };

  const hiddenContent = () => {
    const content = [];

    // Group by Project
    projects.forEach(project => {
        if (!project) return;

        const isProjectHidden = settings.hiddenProjectIds.includes(project.id);
        const projectEvents = events.filter(e => e && e.projectId === project.id);

        // Find events that are hidden either individually or because the project is hidden
        const hiddenProjectEvents = projectEvents.filter(e => isProjectHidden || settings.hiddenEventIds.includes(e.id));

        if (hiddenProjectEvents.length > 0) {
            content.push(
                <div key={`proj-${project.id}`} className={`mb-6 p-5 rounded-xl border ${isProjectHidden ? 'border-red-500/30 bg-red-500/5' : 'border-white/10 bg-black/40'}`}>
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full" style={{backgroundColor: project.color}} />
                            <h3 className={`text-xl font-bold text-white ${isProjectHidden ? 'line-through text-gray-400 decoration-red-500/50' : ''}`}>
                                {project.name}
                            </h3>
                            {isProjectHidden && (
                                <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Project Hidden</span>
                            )}
                        </div>
                        {isProjectHidden && (
                            <button
                                onClick={() => handleUnhideProject(project.id)}
                                className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-md text-sm transition-colors border border-green-500/30"
                            >
                                Unhide Project
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        {hiddenProjectEvents.map(event => {
                            const isIndividuallyHidden = settings.hiddenEventIds.includes(event.id);

                            return (
                                <div key={event.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors gap-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs font-mono uppercase border border-gray-700">{event.type}</span>
                                            {isIndividuallyHidden && !isProjectHidden && (
                                                <span className="text-xs text-orange-400 italic font-mono">Individually hidden</span>
                                            )}
                                        </div>
                                        <h4 className={`text-base font-medium text-gray-200 ${(isProjectHidden || isIndividuallyHidden) ? 'line-through text-gray-500' : ''}`}>{event.title}</h4>
                                        <div className="text-xs text-gray-400 font-mono flex gap-3">
                                            <span>{moment(event.startTime).format('ddd, MMM Do YYYY')}</span>
                                            <span>{moment(event.startTime).format('h:mm a')} - {moment(event.endTime).format('h:mm a')}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleUnhideEvent(event.id, isProjectHidden, project.id)}
                                        className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-md text-sm font-medium transition-colors border border-emerald-500/30 whitespace-nowrap"
                                    >
                                        Unhide Event
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
    });

    return content;
  };

  const hiddenElements = hiddenContent();

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full">
      <div className="flex-1 flex flex-col gap-8 min-w-0">
        <header className="glass-panel p-6">
          <h2 className="text-3xl font-bold tracking-tight heading-gradient">Hidden Events</h2>
          <p className="text-gray-400 mt-1">Review events and projects that are currently hidden from views.</p>
        </header>

        <div className="glass-panel p-6">
          {hiddenElements.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-emerald-500"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <p className="text-lg">No hidden events!</p>
              <p className="text-sm mt-2">All your projects and events are visible.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {hiddenElements}
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-[400px] shrink-0">
        <ProjectToggles />
      </div>
    </div>
  );
}
