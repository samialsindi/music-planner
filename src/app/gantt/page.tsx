'use client';
import GanttView from '@/components/GanttView';

export default function GanttPage() {
  return (
    <div className="flex flex-col gap-8 h-full">
      <header className="flex justify-between items-center glass-panel p-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight heading-gradient">Gantt View</h2>
          <p className="text-gray-400 mt-1">Timeline view of your projects.</p>
        </div>
      </header>
      <div className="flex-1 w-full">
        <GanttView />
      </div>
    </div>
  );
}
