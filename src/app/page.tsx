import React from 'react';
import CalendarView from '@/components/CalendarView';
import GanttView from '@/components/GanttView';
import ProjectToggles from '@/components/ProjectToggles';

export default function Home() {
  return (
    <div className="flex gap-8 h-full">
      {/* Left Main Column: Visuals */}
      <div className="flex-1 flex flex-col gap-8 min-w-0">
        <header className="flex justify-between items-center glass-panel p-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight heading-gradient">Dashboard</h2>
            <p className="text-gray-400 mt-1">Welcome back. You have 3 potential clashes this week.</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 transition-colors shadow-lg shadow-purple-500/20 font-medium whitespace-nowrap">
              + New Event (Voice)
            </button>
          </div>
        </header>

        <div className="flex flex-col gap-6">
          <CalendarView />
          <GanttView />
        </div>
      </div>

      {/* Right Sidebar Column: Toggles */}
      <div className="w-[400px] shrink-0">
        <ProjectToggles />
      </div>
    </div>
  );
}
