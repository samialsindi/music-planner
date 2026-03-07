import { NextResponse } from 'next/server';
import ical from 'node-ical';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// This endpoint can be hit via a cron job (like Vercel Cron) or manually to sync GCAL
export async function GET() {
  const url = process.env.GCAL_ICS_URL;
  if (!url) {
    return NextResponse.json({ error: 'Missing GCAL_ICS_URL env variable in Vercel. Please add your Private ICS link.' }, { status: 400 });
  }

  try {
    const events = await ical.async.fromURL(url);
    const parsedEvents = [];

    // Ensure a "Google Calendar" project exists in our DB
    let { data: project } = await supabase.from('projects').select('id').eq('name', 'Google Calendar').maybeSingle();
    
    if (!project) {
      const { data: newProject, error: projErr } = await supabase.from('projects').insert({ name: 'Google Calendar', color: '#4285F4' }).select().single();
      if (projErr) throw projErr;
      project = newProject;
    }

    // Only import events from 1 month ago onwards
    const syncThreshold = new Date();
    syncThreshold.setMonth(syncThreshold.getMonth() - 1);

    for (const key in events) {
      if (Object.prototype.hasOwnProperty.call(events, key)) {
        const event = events[key] as any;
        if (event.type === 'VEVENT') {
          const start = new Date(event.start as Date);
          const end = new Date(event.end as Date);
          
          if (start < syncThreshold) continue; // Skip old events

          parsedEvents.push({
            id: `gcal-${event.uid}`,
            project_id: project!.id,
            title: event.summary || 'Busy',
            type: 'other',
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            source: 'gcal',
            external_id: event.uid,
            is_toggled: true
          });
        }
      }
    }

    if (parsedEvents.length > 0) {
      const { error: upsertErr } = await supabase.from('events').upsert(parsedEvents, { onConflict: 'id' });
      if (upsertErr) throw upsertErr;
    }

    return NextResponse.json({ success: true, count: parsedEvents.length });
  } catch (error: any) {
    console.error("GCal Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
