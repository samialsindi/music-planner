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


    const parsedEvents: any[] = [];
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

        // Try to extract orchestra and project from title (e.g. "NY Phil - Beethoven 9th - Rehearsal 1")
        let orchName = 'Imported Calendar';
        let projName = 'Imported Events';
        let eventTitle = title;

        const parts = title.split(' - ').map(s => s.trim());
        if (parts.length >= 3) {
            orchName = parts[0];
            projName = parts[1];
            eventTitle = parts.slice(2).join(' - ');
        } else if (parts.length === 2) {
            orchName = parts[0];
            eventTitle = parts[1];
        }

        parsedEvents.push({
            id: `gcal-${uidMatch[1].trim()}`.toLowerCase(),
            _orchName: orchName,
            _projName: projName,
            title: eventTitle,
            type: eventType,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            status: 'approved',
            source: 'gcal',
            external_id: uidMatch[1].trim(),
            is_toggled: true
        });
    }

    if (parsedEvents.length > 0) {
      // Create unique orchestrations
      const uniqueOrchNames = [...new Set(parsedEvents.map(e => e._orchName))];
      for (const name of uniqueOrchNames) {
         await supabase.from('orchestras').insert({ name, color: '#4285F4' }).select().single().then(r => r.error && r.error.code !== '23505' ? console.error(r.error) : null);
      }
      const { data: allOrchs } = await supabase.from('orchestras').select('id, name');
      const orchMap = new Map(allOrchs?.map(o => [o.name, o.id]) || []);

      // Create unique projects
      const uniqueProjs = new Map(); // key: "orch_id-projName"
      for (const e of parsedEvents) {
         const oId = orchMap.get(e._orchName);
         if (oId) uniqueProjs.set(`${oId}-${e._projName}`, { orchestra_id: oId, name: e._projName });
      }

      for (const proj of uniqueProjs.values()) {
        const { data: existing } = await supabase.from('projects').select('id').eq('name', proj.name).eq('orchestra_id', proj.orchestra_id).maybeSingle();
        if (!existing) {
           await supabase.from('projects').insert({ ...proj, color: '#4285F4' }).select().single();
        }
      }

      const { data: allProjs } = await supabase.from('projects').select('id, name, orchestra_id');
      const projMap = new Map(allProjs?.map(p => [`${p.orchestra_id}-${p.name}`, p.id]) || []);

      // Map project_id back to events
      for (const e of parsedEvents) {
         const oId = orchMap.get(e._orchName);
         const pId = projMap.get(`${oId}-${e._projName}`);
         e.project_id = pId || project!.id; // fallback to generic GCal project
         delete e._orchName;
         delete e._projName;
      }

      // Deduplicate
      const uniqueEventsMap = new Map();
      for (const event of parsedEvents) {
        uniqueEventsMap.set(event.id, event);
      }
      const uniqueEvents = Array.from(uniqueEventsMap.values());

      const { error: upsertErr } = await supabase.from('events').upsert(uniqueEvents, { onConflict: 'id' });
      if (upsertErr) throw upsertErr;
    }

    return NextResponse.json({ success: true, count: parsedEvents.length });
  } catch (error: any) {
    console.error("GCal Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
