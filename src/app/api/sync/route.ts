import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rrulestr } from 'rrule';

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
        // Clear audit log to prevent undoing stale IDs
        await supabase.from('audit_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch ICS file");
        const icsData = await response.text();

        // Wipe the old monolithic Google Calendar project and its events
        await supabase.from('projects').delete().eq('name', 'Google Calendar');
        await supabase.from('projects').delete().eq('name', 'Google Calendar Sync');
        await supabase.from('orchestras').delete().eq('name', 'Google Calendar Sync');

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
            const isAllDay = dtstartMatch[1].length === 8;

            let endDate = dtendMatch ? parseICSDate(dtendMatch[1]) : new Date(startDate.getTime() + 60 * 60 * 1000);

            if (isAllDay) {
                // All-day events in ICS have exclusive midnight end dates.
                // Setting them to noon UTC prevents timezone shifts from pushing them to adjacent days in the UI.
                startDate.setUTCHours(12, 0, 0, 0);
                // Subtract 12 hours from the exclusive end midnight to land on noon of the actual final day.
                endDate = new Date(endDate.getTime() - 12 * 60 * 60 * 1000);
            }

            const year = startDate.getFullYear();
            const currentYear = new Date().getFullYear();
            if (year < currentYear - 1 || year > currentYear + 3) continue;
            const title = summaryMatch ? summaryMatch[1].trim() : 'Busy';
            const rruleMatch = block.match(/RRULE:(.*)\r?\n/);
            const isDailyRepeat = rruleMatch && rruleMatch[1].includes('FREQ=DAILY');
            const isMotDue = title.toUpperCase().includes('MOT DUE');
            if (isAllDay && (isDailyRepeat || isMotDue)) continue;

            let eventType = 'other';
            const lowerTitle = title.toLowerCase();
            if (lowerTitle.includes('rehearsal') || lowerTitle.includes('reh')) {
                eventType = 'rehearsal';
            } else if (lowerTitle.includes('concert') || lowerTitle.includes('performance') || lowerTitle.includes('show')) {
                eventType = 'concert';
            }

            let orchName = 'Personal';
            let projName = 'Personal';
            let eventTitle = title.trim();

            const parts = title.split(/\s+[-/]\s+/).filter((s: string) => s.trim().length > 0);
            if (parts.length >= 3) {
                orchName = parts[0];
                projName = parts[1];
                eventTitle = parts.slice(2).join(' - ');
            } else if (parts.length === 2) {
                orchName = parts[0];
                projName = parts[0];
                eventTitle = parts[1];
            } else if (parts.length === 1) {
                // Check if the event starts with a known ensemble abbreviation (e.g. "CGC rehearsal")
                eventTitle = parts[0];
                const firstWord = eventTitle.split(' ')[0].toUpperCase();

                if (['CGC', 'HSB'].includes(firstWord)) {
                    orchName = firstWord;
                    projName = firstWord;
                }
            }

            // Apply abbreviation mapping
            if (orchName.toLowerCase().includes('haverhill silver band') || orchName.toLowerCase() === 'hsb') {
                orchName = 'HSB';
            }

            // Convert all-day rehearsals to 7pm-10pm
            let finalIsAllDay = isAllDay;
            let finalStartDate = startDate;
            let finalEndDate = endDate;

            if (isAllDay && eventType === 'rehearsal') {
                finalIsAllDay = false;

                // Set start to 19:00 (7 PM)
                finalStartDate = new Date(startDate);
                finalStartDate.setUTCHours(19, 0, 0, 0);

                // Set end to 22:00 (10 PM)
                finalEndDate = new Date(startDate);
                finalEndDate.setUTCHours(22, 0, 0, 0);
            }

            const baseEvent = {
                _orchName: orchName,
                _projName: projName,
                title: eventTitle,
                type: eventType,
                is_all_day: finalIsAllDay,
                status: 'approved',
                source: 'gcal',
                external_id: uidMatch[1].trim(),
                is_toggled: true,
                is_declined: false
            };

            const duration = finalEndDate.getTime() - finalStartDate.getTime();

            if (rruleMatch) {
                try {
                    // Extract exact string without trailing carriage return
                    const rruleStr = rruleMatch[1].trim();
                    // Setup rrule with the start date (ignoring timezone issues by relying on rrule's string parsing)
                    const rule = rrulestr(`DTSTART:${dtstartMatch[1].trim()}\nRRULE:${rruleStr}`);

                    // Generate occurrences until end of 2027
                    const untilDate = new Date('2027-12-31T23:59:59Z');
                    const occurrences = rule.between(startDate, untilDate, true);

                    for (let j = 0; j < occurrences.length; j++) {
                        // For repeating events, apply the exact same time adjustment logic as the base event
                        const occStart = occurrences[j];

                        let finalOccStart = occStart;
                        let finalOccEnd = new Date(occStart.getTime() + duration);

                        if (isAllDay && eventType === 'rehearsal') {
                            finalOccStart = new Date(occStart);
                            finalOccStart.setUTCHours(19, 0, 0, 0);

                            finalOccEnd = new Date(occStart);
                            finalOccEnd.setUTCHours(22, 0, 0, 0);
                        }

                        parsedEvents.push({
                            ...baseEvent,
                            id: `gcal-${uidMatch[1].trim()}-${j}`.toLowerCase(),
                            start_time: finalOccStart.toISOString(),
                            end_time: finalOccEnd.toISOString()
                        });
                    }
                } catch (e) {
                    console.error('Error parsing RRULE for event:', title, e);
                    // Fallback to single event
                    parsedEvents.push({
                        ...baseEvent,
                        id: `gcal-${uidMatch[1].trim()}`.toLowerCase(),
                        start_time: finalStartDate.toISOString(),
                        end_time: finalEndDate.toISOString()
                    });
                }
            } else {
                parsedEvents.push({
                    ...baseEvent,
                    id: `gcal-${uidMatch[1].trim()}`.toLowerCase(),
                    start_time: finalStartDate.toISOString(),
                    end_time: finalEndDate.toISOString()
                });
            }
        }

        if (parsedEvents.length > 0) {
            const colors = [
                '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
                '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f43f5e'
            ];
            let colorIdx = 0;
            const getNextColor = () => colors[colorIdx++ % colors.length];

            // Create unique orchestrations
            const uniqueOrchNames = [...new Set(parsedEvents.map(e => e._orchName))];
            for (const name of uniqueOrchNames) {
                await supabase.from('orchestras').insert({ name, color: getNextColor() }).select().single().then(r => r.error && r.error.code !== '23505' ? console.error(r.error) : null);
            }
            // Fetch all known orchestras to map names to IDs correctly
            const { data: allOrchs } = await supabase.from('orchestras').select('id, name').limit(5000);
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
                    await supabase.from('projects').insert({ ...proj, color: getNextColor() }).select().single();
                }
            }

            // Fetch all known projects to map names to IDs correctly
            const { data: allProjs } = await supabase.from('projects').select('id, name, orchestra_id').limit(5000);
            const projMap = new Map(allProjs?.map(p => [`${p.orchestra_id}-${p.name}`, p.id]) || []);

            // Map project_id back to events
            for (const e of parsedEvents) {
                const oId = orchMap.get(e._orchName);
                const pId = projMap.get(`${oId}-${e._projName}`);
                if (pId) {
                    e.project_id = pId;
                } else {
                    console.warn(`Could not find project ID for ${e._projName}`);
                }
                delete e._orchName;
                delete e._projName;
            }

            // Filter out any events that failed to map
            const validEvents = parsedEvents.filter(e => e.project_id);

            // Deduplicate
            const uniqueEventsMap = new Map();
            for (const event of validEvents) {
                uniqueEventsMap.set(event.id, event);
            }
            const uniqueEvents = Array.from(uniqueEventsMap.values());

            // Backward Immutability logic: Events starting before today at 13:30 should not be overwritten if they already exist
            const threshold = new Date();
            threshold.setHours(13, 30, 0, 0);

            // Fetch existing IDs to avoid overwriting human-edited past events (must fetch beyond 1000 limit)
            const { data: existingEventsData } = await supabase.from('events').select('id').limit(10000);
            const existingEventIds = new Set(existingEventsData?.map((e: any) => e.id) || []);

            const eventsToUpsert = uniqueEvents.filter((e: any) => {
                const eventStart = new Date(e.start_time);
                if (eventStart < threshold && existingEventIds.has(e.id)) {
                    // Do not overwrite human-managed past events
                    return false;
                }
                return true;
            });

            if (eventsToUpsert.length > 0) {
                const { error: upsertErr } = await supabase.from('events').upsert(eventsToUpsert, { onConflict: 'id' });
                if (upsertErr) throw upsertErr;
            }
        }

        return NextResponse.json({ success: true, count: parsedEvents.length });
    } catch (error: any) {
        console.error("GCal Sync Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
