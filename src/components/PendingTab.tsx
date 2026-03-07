import React, { useState } from 'react';
import { useAppStore, ProjectEvent } from '@/lib/store';
import { supabase } from '@/lib/supabase';

export default function PendingTab() {
  const { events, updateEvent, orchestras, projects } = useAppStore();
  const pendingEvents = events.filter(e => e.status === 'pending');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProjectEvent>>({});

  const startEdit = (event: ProjectEvent) => {
    setEditingId(event.id);
    setEditForm({ ...event });
  };

  const handleApprove = async (event: ProjectEvent) => {
    const updated = { ...event, status: 'approved' as const };

    // Update in Supabase
    const { error } = await supabase.from('events').update({
      status: 'approved',
      title: event.title,
      start_time: event.startTime.toISOString(),
      end_time: event.endTime.toISOString(),
      is_all_day: event.isAllDay,
    }).eq('id', event.id);

    if (error) {
      alert("Failed to approve event: " + error.message);
      return;
    }

    // Update locally
    updateEvent(updated);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm) return;

    // Save changes but keep as pending until explicitly approved
    const { error } = await supabase.from('events').update({
      title: editForm.title,
      start_time: editForm.startTime?.toISOString(),
      end_time: editForm.endTime?.toISOString(),
      is_all_day: editForm.isAllDay,
    }).eq('id', editingId);

    if (error) {
      alert("Failed to save event edits: " + error.message);
      return;
    }

    updateEvent(editForm as ProjectEvent);
    setEditingId(null);
  };

  if (pendingEvents.length === 0) {
    return (
      <div className="glass-panel p-6 flex flex-col items-center justify-center text-gray-400 py-12">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
        <p>No pending events to review.</p>
        <p className="text-sm mt-2 opacity-75">Forward an email to ingest new events.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {pendingEvents.map(event => {
        const project = projects.find(p => p.id === event.projectId);
        const orchestra = orchestras.find(o => o.id === project?.orchestraId);

        const isEditing = editingId === event.id;

        return (
          <div key={event.id} className="glass-panel p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            {isEditing ? (
              <div className="flex flex-col gap-2 w-full max-w-lg">
                <input
                  type="text"
                  className="bg-gray-800 border border-gray-700 rounded p-2 text-white"
                  value={editForm.title}
                  onChange={e => setEditForm({...editForm, title: e.target.value})}
                  placeholder="Event Title"
                />
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-400 flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={editForm.isAllDay}
                      onChange={e => setEditForm({...editForm, isAllDay: e.target.checked})}
                    />
                    All Day
                  </label>
                </div>
                {!editForm.isAllDay && (
                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      className="bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white"
                      value={new Date(editForm.startTime!.getTime() - (editForm.startTime!.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)}
                      onChange={e => setEditForm({...editForm, startTime: new Date(e.target.value)})}
                    />
                    <input
                      type="datetime-local"
                      className="bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white"
                      value={new Date(editForm.endTime!.getTime() - (editForm.endTime!.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)}
                      onChange={e => setEditForm({...editForm, endTime: new Date(e.target.value)})}
                    />
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <button onClick={handleSaveEdit} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-sm">Save</button>
                  <button onClick={() => setEditingId(null)} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">PENDING</span>
                  <span className="text-xs text-gray-400">{orchestra?.name} • {project?.name}</span>
                </div>
                <h4 className="text-lg font-bold text-white mt-1">{event.title}</h4>
                <div className="text-sm text-gray-300 mt-1">
                  {event.isAllDay ? (
                    <span>{event.startTime.toLocaleDateString()} (All Day)</span>
                  ) : (
                    <span>{event.startTime.toLocaleString()} - {event.endTime.toLocaleTimeString()}</span>
                  )}
                </div>
                {event.inferredInstrumentation?.notes && (
                  <div className="text-xs text-purple-300 bg-purple-900/30 p-2 rounded mt-2 border border-purple-500/20">
                    <span className="font-semibold">AI Notes:</span> {event.inferredInstrumentation.notes}
                  </div>
                )}
              </div>
            )}

            {!isEditing && (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => startEdit(event)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleApprove(event)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Approve
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
