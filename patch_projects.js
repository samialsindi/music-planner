const fs = require('fs');

const file = 'src/app/projects/page.tsx';
const code = `
'use client';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function ProjectsPage() {
  const { projects, events, setProjects } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!window.confirm(\`Are you sure you want to delete the project "\${projectName}"? All associated events will be marked as personal.\`)) {
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Find all events for this project
      const projectEvents = events.filter(e => e.projectId === projectId);

      // 2. Mark them as personal
      const updates = projectEvents.map(e =>
        supabase.from('events').update({ type: 'personal' }).eq('id', e.id)
      );

      // 3. Deactivate the project (soft delete)
      updates.push(
        supabase.from('projects').update({ is_active: false }).eq('id', projectId)
      );

      await Promise.all(updates);

      // Update local state
      setProjects(projects.filter(p => p.id !== projectId));

      alert(\`Successfully deleted "\${projectName}" and marked \${projectEvents.length} events as personal.\`);
      window.location.reload(); // Reload to refresh everything cleanly

    } catch (err) {
      console.error(err);
      alert('Failed to delete project.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 h-full">
      <header className="flex justify-between items-center glass-panel p-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight heading-gradient">Projects</h2>
          <p className="text-gray-400 mt-1">Manage and view your projects. Deleting a project will mark all its events as personal.</p>
        </div>
      </header>

      <div className="flex-1 w-full max-w-4xl grid gap-4">
        {projects.filter(p => p.isActive).map(project => {
          const projectEventCount = events.filter(e => e.projectId === project.id).length;
          return (
            <div key={project.id} className="glass-panel p-6 flex justify-between items-center relative overflow-hidden">
              <div
                className="absolute left-0 top-0 bottom-0 w-2"
                style={{ backgroundColor: project.color }}
              />
              <div className="pl-4">
                <h3 className="text-xl font-bold text-white">{project.name}</h3>
                <p className="text-gray-400 text-sm">{projectEventCount} events associated</p>
              </div>
              <button
                onClick={() => handleDeleteProject(project.id, project.name)}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded-lg transition-colors font-bold text-sm"
              >
                Delete Project
              </button>
            </div>
          );
        })}
        {projects.filter(p => p.isActive).length === 0 && (
          <div className="text-gray-500 text-center p-8 glass-panel">
            No active projects found.
          </div>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync(file, code);
