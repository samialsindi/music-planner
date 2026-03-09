'use client';
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import CalendarView from '@/components/CalendarView';
import GanttView from '@/components/GanttView';
import ProjectToggles from '@/components/ProjectToggles';
import { useAppStore } from '@/lib/store';
import { parseEmailWithLLM } from '@/lib/llm';
import PendingTab from '@/components/PendingTab';

export default function Home() {
  const { addEvent, projects, events, orchestras, setOrchestras, setProjects, setEvents, setSettings, settings } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'pending'>('calendar');
  const pendingCount = events.filter(e => e.status === 'pending').length;
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    async function fetchData() {
      // Fetch user settings
      const { data: settingsData, error: settingsErr } = await supabase.from('user_settings').select('*').eq('id', 1).maybeSingle();
      if (!settingsErr && settingsData) {
        setSettings({
          hiddenProjectIds: settingsData.hidden_project_ids || [],
          hiddenEventIds: settingsData.hidden_event_ids || [],
          eventTypeFilters: settingsData.event_type_filters || { rehearsal: true, concert: true, personal: true, other: true }
        });
      }

      // Fetch orchestras
      const { data: orchData, error: orchErr } = await supabase.from('orchestras').select('*');
      if (!orchErr && orchData) {
        const mappedOrchestras = orchData.map((o: any) => ({
          id: o.id,
          name: o.name,
          color: o.color,
          isActive: o.is_active
        }));
        setOrchestras(mappedOrchestras);
      }

      // Fetch projects
      const { data: projData, error: projErr } = await supabase.from('projects').select('*');
      if (!projErr && projData) {
        const mappedProjects = projData.map(p => ({
          id: p.id, orchestraId: p.orchestra_id,
          name: p.name,
          color: p.color,
          isActive: p.is_active
        }));
        setProjects(mappedProjects);
      }

      // Fetch events
      const { data: evtData, error: evtErr } = await supabase.from('events').select('*');
      if (!evtErr && evtData) {
        const mappedEvents = evtData.map(e => ({
          id: e.id,
          projectId: e.project_id,
          title: e.title,
          type: e.type,
          startTime: new Date(e.start_time),
          endTime: new Date(e.end_time),
          source: e.source,
          externalId: e.external_id,
          isToggled: e.is_toggled,
          isDeclined: e.is_declined || false,
          isAllDay: e.is_all_day || false,
          status: e.status || 'approved',
          inferredInstrumentation: {
            timpaniRequired: e.timpani_required || false,
            percussionRequired: e.percussion_required || false,
            notes: e.inferred_notes || '',
          }
        }));
        setEvents(mappedEvents);
      }
    }
    fetchData();
  }, [setOrchestras, setProjects, setEvents, setSettings]);

  const processTextWithLLM = async (text: string) => {
    setIsProcessing(true);
    try {
      const newEvent = await parseEmailWithLLM(text, projects[0].id); // Default to Project 1
      await new Promise(resolve => setTimeout(resolve, 800));
      addEvent(newEvent);
      alert(`Success via Voice! Parsed: ${newEvent.title}\nInferred: ${newEvent.inferredInstrumentation?.notes}`);
    } catch (err) {
      console.error(err);
      alert("Error parsing voice input.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onstart = () => {
      setIsListening(true);
    };

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log("Captured Voice:", transcript);
      setIsListening(false);
      processTextWithLLM(transcript); // Send to LLM immediately
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech Recognition Error", event);
      setIsListening(false);
    };

    recognitionRef.current.start();
  };


  const handleSync = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/sync');
      const data = await response.json();
      if (response.ok) {
        alert(`Successfully synced ${data.count} events from Google Calendar.`);
        // Reload page to reflect new events
        window.location.reload();
      } else {
        alert(`Error syncing: ${data.error}`);
      }
    } catch (err) {
      console.error("Sync error", err);
      alert("Failed to sync with Google Calendar.");
    } finally {
      setIsProcessing(false);
    }
  };


  const handleCleanUp = async () => {
    setIsProcessing(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

      const updates = [];
      const newHiddenIds = [...settings.hiddenEventIds];
      let updatedCount = 0;

      // 1. Process events ending before 12pm
      for (const e of events) {
        if (!e) continue;
        const endHour = e.endTime.getHours();
        const endMinute = e.endTime.getMinutes();
        const endTimeFloat = endHour + (endMinute / 60);

        if (endTimeFloat <= 12 && !e.isAllDay) {
          // It ends before or at 12pm
          updates.push(
            supabase.from('events').update({ type: 'personal' }).eq('id', e.id)
          );
          if (!newHiddenIds.includes(e.id)) {
            newHiddenIds.push(e.id);
          }
          updatedCount++;
        }
      }

      // 2. Process all-day events that are NOT personal
      for (const e of events) {
        if (!e) continue;
        
        let needsUpdate = false;
        let updateData: any = {};

        // Convert to 7pm - 10pm same day for rehearsals
        if (e.isAllDay && e.type !== 'personal') {
          const newStart = new Date(e.startTime);
          newStart.setHours(19, 0, 0, 0); // 7 PM

          const newEnd = new Date(e.startTime);
          newEnd.setHours(22, 0, 0, 0); // 10 PM

          updateData = {
            is_all_day: false,
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
            type: 'rehearsal' // Default to rehearsal as requested "rehearsal 7-10pm"
          };
          needsUpdate = true;
        }

        // Apply HSB abbreviation if missing
        if (e.title && (e.title.toLowerCase().includes('haverhill silver band') || e.title.includes('Haverhill'))) {
            updateData = {
               ...updateData,
               title: e.title.replace(/Haverhill Silver Band/i, 'HSB')
            };
            needsUpdate = true;
        }

        if (needsUpdate) {
            updates.push(supabase.from('events').update(updateData).eq('id', e.id));
            updatedCount++;
        }
      }

      if (updates.length > 0) {
        await Promise.all(updates);
        await supabase.from('user_settings').update({ hidden_event_ids: newHiddenIds }).eq('id', 1);
        alert(`Clean up complete! Updated ${updatedCount} events.`);
        window.location.reload();
      } else {
        alert('No events needed cleaning up.');
      }

    } catch (err) {
      console.error(err);
      alert('Error during clean up.');
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full">
      {/* Left Main Column: Visuals */}
      <div className="flex-1 flex flex-col gap-8 min-w-0">

        <header className="flex justify-between items-center glass-panel p-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight heading-gradient">Dashboard</h2>
            <p className="text-gray-400 mt-1">Welcome back. You have 3 potential clashes this week.</p>
          </div>
          <div className="flex flex-col gap-4 items-end">
            <div className="flex items-center gap-4">

              <button
                onClick={handleCleanUp}
                disabled={isProcessing}
                className={`px-4 py-2 text-sm rounded-xl transition-colors font-medium whitespace-nowrap ${
                  isProcessing
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'glass-panel text-orange-400 border border-orange-500/30 hover:bg-orange-500/10'
                }`}
              >
                🧹 Clean Up
              </button>

              <button
                onClick={handleCleanUp}
                disabled={isProcessing}
                className={`px-4 py-2 text-sm rounded-xl transition-colors font-medium whitespace-nowrap ${
                  isProcessing
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'glass-panel text-orange-400 border border-orange-500/30 hover:bg-orange-500/10'
                }`}
              >
                🧹 Clean Up
              </button>
              <button
                onClick={handleSync}
                disabled={isProcessing}
                className={`px-4 py-2 text-sm rounded-xl transition-colors font-medium whitespace-nowrap ${
                  isProcessing
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'glass-panel text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Sync Calendar
              </button>

            </div>
            <div className="flex bg-gray-900/50 rounded-lg p-1 border border-white/5">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'calendar'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'pending'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                Pending Review
                {pendingCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-6">
          {activeTab === 'calendar' ? (
            <>
              <CalendarView />
              <GanttView />
            </>
          ) : (
            <PendingTab />
          )}
        </div>

      </div>

      {/* Right Sidebar Column: Toggles */}
      <div className="w-full lg:w-[400px] shrink-0">
        <ProjectToggles />
      </div>
    </div>
  );
}
