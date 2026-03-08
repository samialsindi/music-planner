'use client';
import CalendarView from '@/components/CalendarView';

export default function CalendarPage() {
  return (
    <div className="flex flex-col gap-8 h-full">
      <header className="flex justify-between items-center glass-panel p-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight heading-gradient">Calendar</h2>
          <p className="text-gray-400 mt-1">Full calendar view of your schedule.</p>
        </div>
      </header>
      <div className="flex-1 w-full">
        <CalendarView />
      </div>
    </div>
  );
}
