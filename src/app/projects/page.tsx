'use client';
import { useAppStore, Project } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useMemo, useState } from 'react';
import moment from 'moment';

type Section = { key: 'proposed' | 'accepted' | 'declined'; label: string; tint: string };

const SECTIONS: Section[] = [
  { key: 'proposed', label: 'Needs Decision', tint: 'text-amber-300' },
  { key: 'accepted', label: 'Accepted', tint: 'text-emerald-300' },
  { key: 'declined', label: 'Declined', tint: 'text-rose-300' },
];

export default function ProjectsPage() {
  const { projects, events, orchestras, setProjects, acceptProject, declineProject, resetProjectDecision } = useAppStore();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const projectMeta = useMemo(() => {
    const map = new Map<string, { upcoming: number; nextDate: Date | null }>();
    for (const p of projects) {
      const projEvents = events
        .filter(e => e.projectId === p.id && e.startTime >= today)
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      map.set(p.id, { upcoming: projEvents.length, nextDate: projEvents[0]?.startTime || null });
    }
    return map;
  }, [projects, events, today]);

  const grouped = useMemo(() => {
    const groups: Record<Section['key'], Project[]> = { proposed: [], accepted: [], declined: [] };
    for (const p of projects.filter(p => p.isActive)) {
      groups[p.status || 'proposed'].push(p);
    }
    for (const k of Object.keys(groups) as Section['key'][]) {
      groups[k].sort((a, b) => {
        const am = projectMeta.get(a.id)?.nextDate?.getTime() ?? Infinity;
        const bm = projectMeta.get(b.id)?.nextDate?.getTime() ?? Infinity;
        return am - bm;
      });
    }
    return groups;
  }, [projects, projectMeta]);

  const handleAccept = async (id: string) => {
    setBusyId(id);
    try { await acceptProject(id); } finally { setBusyId(null); }
  };
  const handleDecline = async (id: string) => {
    setBusyId(id);
    try { await declineProject(id); } finally { setBusyId(null); }
  };
  const handleReset = async (id: string) => {
    setBusyId(id);
    try { await resetProjectDecision(id); } finally { setBusyId(null); }
  };

  const handleDelete = async (project: Project) => {
    setBusyId(project.id);
    try {
      const projectEvents = events.filter(e => e.projectId === project.id);
      const updates = projectEvents.map(e =>
        supabase.from('events').update({ type: 'personal' }).eq('id', e.id)
      );
      updates.push(supabase.from('projects').update({ is_active: false }).eq('id', project.id));
      await Promise.all(updates);
      setProjects(projects.filter(p => p.id !== project.id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete project.');
    } finally {
      setBusyId(null);
      setConfirmDeleteId(null);
    }
  };

  const renderCard = (project: Project) => {
    const meta = projectMeta.get(project.id);
    const orch = orchestras.find(o => o.id === project.orchestraId);
    const isBusy = busyId === project.id;

    return (
      <div
        key={project.id}
        className="glass-panel p-5 flex flex-col md:flex-row md:items-center gap-4 relative overflow-hidden"
      >
        <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: project.color }} />
        <div className="pl-4 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-white truncate">{project.name}</h3>
            {orch && (
              <span className="text-xs text-gray-400 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                {orch.name}
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">
            {meta?.upcoming ?? 0} upcoming event{meta?.upcoming === 1 ? '' : 's'}
            {meta?.nextDate && (
              <> · next {moment(meta.nextDate).format('ddd, MMM D')}</>
            )}
            {project.decidedAt && (
              <> · decided {moment(project.decidedAt).fromNow()}</>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {project.status !== 'accepted' && (
            <button
              onClick={() => handleAccept(project.id)}
              disabled={isBusy}
              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Accept
            </button>
          )}
          {project.status !== 'declined' && (
            <button
              onClick={() => handleDecline(project.id)}
              disabled={isBusy}
              className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Decline
            </button>
          )}
          {project.status !== 'proposed' && (
            <button
              onClick={() => handleReset(project.id)}
              disabled={isBusy}
              className="px-3 py-1.5 bg-gray-700/40 hover:bg-gray-700/60 text-gray-300 border border-gray-600/40 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              Reset
            </button>
          )}
          {confirmDeleteId === project.id ? (
            <button
              onClick={() => handleDelete(project)}
              disabled={isBusy}
              className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-semibold"
            >
              Confirm delete
            </button>
          ) : (
            <button
              onClick={() => setConfirmDeleteId(project.id)}
              disabled={isBusy}
              className="px-2 py-1.5 text-gray-500 hover:text-red-400 text-sm transition-colors"
              title="Delete project (marks events as personal)"
            >
              ⋯
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 h-full">
      <header className="flex justify-between items-center glass-panel p-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight heading-gradient">Projects</h2>
          <p className="text-gray-400 mt-1">
            Decide which upcoming musical projects you&apos;re working on. Accept publishes events to your confirmed Google calendar.
          </p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <div>{grouped.proposed.length} needs decision</div>
          <div className="text-emerald-400">{grouped.accepted.length} accepted</div>
          <div className="text-rose-400">{grouped.declined.length} declined</div>
        </div>
      </header>

      <div className="flex flex-col gap-8 w-full max-w-4xl">
        {SECTIONS.map(section => (
          <section key={section.key}>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${section.tint}`}>
              {section.label}
              <span className="ml-2 text-xs text-gray-500 font-normal">
                {grouped[section.key].length}
              </span>
            </h3>
            {grouped[section.key].length === 0 ? (
              <div className="text-gray-500 text-sm italic glass-panel p-4">
                {section.key === 'proposed' && 'No new projects awaiting your decision.'}
                {section.key === 'accepted' && "You haven't accepted any projects yet."}
                {section.key === 'declined' && "No declined projects."}
              </div>
            ) : (
              <div className="grid gap-3">
                {grouped[section.key].map(renderCard)}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
