'use client';
import GanttView from '@/components/GanttView';

export default function GanttPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-950">
      <header className="flex justify-between items-center glass-panel m-4 p-4 mb-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight heading-gradient">Gantt View</h2>
          <p className="text-xs text-gray-400 mt-1">Timeline view of your projects.</p>
        </div>
      </header>
      <div className="flex-1 w-full overflow-hidden p-4 pt-2">
        <GanttView />
      </div>
    </div>
  );
}
