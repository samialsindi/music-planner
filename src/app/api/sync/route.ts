import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  let url = process.env.GCAL_ICS_URL;

  if (!url) {
    // Try to find any env var that looks like a Google Calendar URL or has CAL/ICS in the name
    const possibleKeys = Object.keys(process.env).filter(key =>
      key.toUpperCase().includes('CAL') ||
      key.toUpperCase().includes('ICS') ||
      key.toUpperCase().includes('URL')
    );

    for (const key of possibleKeys) {
      const val = process.env[key];
      if (typeof val === 'string' && (val.includes('calendar.google.com') || val.endsWith('.ics'))) {
        url = val;
        break;
      }
    }
  }

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
        
        const year = startDate.getFullYear();
        if (year !== 2026 && year !== 2027) continue;

        const isAllDay = dtstartMatch[1].length === 8;
        const title = summaryMatch ? summaryMatch[1].trim() : 'Busy';
        const hasRRule = block.includes('RRULE');
        const isMotDue = title.toUpperCase().includes('MOT DUE');

        if (isAllDay && (hasRRule || isMotDue)) continue;


        let eventType = 'other';
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('rehearsal') || lowerTitle.includes('reh')) {
            eventType = 'rehearsal';
        } else if (lowerTitle.includes('concert') || lowerTitle.includes('performance') || lowerTitle.includes('show')) {
            eventType = 'concert';
        }

        parsedEvents.push({
            id: `gcal-${uidMatch[1].trim()}`,
            project_id: project!.id,
            title: title,
            type: eventType,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            source: 'gcal',
            external_id: uidMatch[1].trim(),
            is_toggled: true
        });
    }

    if (parsedEvents.length > 0) {
      // Deduplicate events by id (keep the last one)
      const uniqueEvents = Object.values(
        parsedEvents.reduce((acc, event) => {
          acc[event.id] = event;
          return acc;
        }, {})
      );

      const { error: upsertErr } = await supabase.from('events').upsert(uniqueEvents, { onConflict: 'id' });
      if (upsertErr) throw upsertErr;
    }

    return NextResponse.json({ success: true, count: parsedEvents.length });
  } catch (error: any) {
    console.error("GCal Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
