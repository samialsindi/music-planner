import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.GCAL_ICS_URL;
  if (!url) {
    return NextResponse.json({ error: 'Missing GCAL_ICS_URL env variable.' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch ICS file");
    const icsData = await response.text();

    let { data: project } = await supabase.from('projects').select('id').eq('name', 'Google Calendar').maybeSingle();
    if (!project) {
      const { data: newProject, error: projErr } = await supabase.from('projects').insert({ name: 'Google Calendar', color: '#4285F4' }).select().single();
      if (projErr) throw projErr;
      project = newProject;
    }

    const syncThreshold = new Date();
    syncThreshold.setMonth(syncThreshold.getMonth() - 1);

    const parsedEvents = [];
    const events = icsData.split('BEGIN:VEVENT');
    
    // Skip the first block (VCALENDAR header)
    for (let i = 1; i < events.length; i++) {
        const block = events[i];
        
        const summaryMatch = block.match(/SUMMARY:(.*)\r?\n/);
        const dtstartMatch = block.match(/DTSTART(?:;[^:]+)?:(.*)\r?\n/);
        const dtendMatch = block.match(/DTEND(?:;[^:]+)?:(.*)\r?\n/);
        const uidMatch = block.match(/UID:(.*)\r?\n/);

        if (!dtstartMatch || !uidMatch) continue;

        // Parse standard ICS date format: YYYYMMDDTHHMMSSZ
        const parseICSDate = (icsDateStr: string) => {
            if (icsDateStr.length === 8) { // All day event (YYYYMMDD)
                const y = icsDateStr.substring(0, 4);
                const m = icsDateStr.substring(4, 6);
                const d = icsDateStr.substring(6, 8);
                return new Date(`${y}-${m}-${d}T00:00:00Z`);
            }
            const y = icsDateStr.substring(0, 4);
            const m = icsDateStr.substring(4, 6);
            const d = icsDateStr.substring(6, 8);
            const h = icsDateStr.substring(9, 11);
            const min = icsDateStr.substring(11, 13);
            const s = icsDateStr.substring(13, 15);
            return new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`);
        };

        const startDate = parseICSDate(dtstartMatch[1]);
        const endDate = dtendMatch ? parseICSDate(dtendMatch[1]) : new Date(startDate.getTime() + 60*60*1000);
        
        if (startDate < syncThreshold) continue;

        parsedEvents.push({
            id: `gcal-${uidMatch[1].trim()}`,
            project_id: project!.id,
            title: summaryMatch ? summaryMatch[1].trim() : 'Busy',
            type: 'other',
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            source: 'gcal',
            external_id: uidMatch[1].trim(),
            is_toggled: true
        });
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
