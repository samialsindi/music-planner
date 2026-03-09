import { createClient } from '@supabase/supabase-js';
import pkg from 'rrule';
const { rrulestr } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function runSync() {
    console.log('Fetching ICS from:', process.env.GCAL_ICS_URL);
    const response = await fetch(process.env.GCAL_ICS_URL);
    const icsData = await response.text();
    console.log(`Fetched ICS! Length: ${icsData.length} chars`);

    const parsedEvents = [];
    const events = icsData.split('BEGIN:VEVENT');

    for (let i = 1; i < events.length; i++) {
        const block = events[i];
        const summaryMatch = block.match(/SUMMARY:(.*)\r?\n/);
        const dtstartMatch = block.match(/DTSTART(?:;[^:]+)?:(.*)\r?\n/);
        const dtendMatch = block.match(/DTEND(?:;[^:]+)?:(.*)\r?\n/);
        const uidMatch = block.match(/UID:(.*)\r?\n/);

        if (!dtstartMatch || !uidMatch) continue;

        const parseICSDate = (icsDateStr) => {
            if (icsDateStr.length === 8) {
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
            startDate.setUTCHours(12, 0, 0, 0);
            endDate = new Date(endDate.getTime() - 12 * 60 * 60 * 1000);
        }

        const year = startDate.getFullYear();
        const currentYear = new Date().getFullYear();
        if (year < currentYear - 1 || year > currentYear + 3) continue;

        const title = summaryMatch ? summaryMatch[1].trim() : 'Busy';
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

        const parts = title.split(/\s+[-/]\s+/).filter((s) => s.trim().length > 0);
        if (parts.length >= 3) {
            orchName = parts[0];
            projName = parts[1];
            eventTitle = parts.slice(2).join(' - ');
        } else if (parts.length === 2) {
            orchName = parts[0];
            projName = parts[0];
            eventTitle = parts[1];
        } else if (parts.length === 1) {
            eventTitle = parts[0];
            const firstWord = eventTitle.split(' ')[0].toUpperCase();
            if (['CGC', 'HSB'].includes(firstWord)) {
                orchName = firstWord;
                projName = firstWord;
            }
        }

        if (orchName.toLowerCase().includes('haverhill silver band') || orchName.toLowerCase() === 'hsb') {
            orchName = 'HSB';
        }

        let finalIsAllDay = isAllDay;
        let finalStartDate = startDate;
        let finalEndDate = endDate;

        if (isAllDay && eventType === 'rehearsal') {
            finalIsAllDay = false;
            finalStartDate = new Date(startDate);
            finalStartDate.setUTCHours(19, 0, 0, 0);
            finalEndDate = new Date(startDate);
            finalEndDate.setUTCHours(22, 0, 0, 0);
        }

        const duration = finalEndDate.getTime() - finalStartDate.getTime();
        const rruleMatch = block.match(/RRULE:(.*)\r?\n/);
        
        if (rruleMatch) {
            try {
                const rruleStr = rruleMatch[1].trim();
                const rule = rrulestr(`DTSTART:${dtstartMatch[1].trim()}\nRRULE:${rruleStr}`);
                const untilDate = new Date('2027-12-31T23:59:59Z');
                const occurrences = rule.between(startDate, untilDate, true);

                for (let j = 0; j < occurrences.length; j++) {
                    const occStart = occurrences[j];
                    let finalOccStart = occStart;
                    let finalOccEnd = new Date(occStart.getTime() + duration);
                    
                    if (isAllDay && eventType === 'rehearsal') {
                         finalOccStart = new Date(occStart);
                         finalOccStart.setUTCHours(19, 0, 0, 0);
                         finalOccEnd = new Date(occStart);
                         finalOccEnd.setUTCHours(22, 0, 0, 0);
                    }
                    parsedEvents.push({ _orchName: orchName, _projName: projName, title: eventTitle, start: finalOccStart, end: finalOccEnd });
                }
            } catch (e) {
                parsedEvents.push({ _orchName: orchName, _projName: projName, title: eventTitle, start: finalStartDate, end: finalEndDate });
            }
        } else {
            parsedEvents.push({ _orchName: orchName, _projName: projName, title: eventTitle, start: finalStartDate, end: finalEndDate });
        }
    }

    console.log(`Successfully parsed ${parsedEvents.length} distinct event occurrences!`);
    console.log('Sample parsed evts:', parsedEvents.slice(0, 3));

    // Check mapping
    const uniqueOrchNames = [...new Set(parsedEvents.map(e => e._orchName))];
    console.log('Unique Orch Names to insert/fetch:', uniqueOrchNames);
    
    // Test fetching from DB
    const { data: dbOrchs, error } = await supabase.from('orchestras').select('id, name');
    if (error) { console.error('DB fetch orchs failed:', error); return; }
    
    console.log(`Found ${dbOrchs?.length || 0} orchestrations in DB.`);
    
    const { data: dbProjs, error: pError } = await supabase.from('projects').select('id, name');
    console.log(`Found ${dbProjs?.length || 0} projects in DB.`);

    const { data: dbEvts, error: eError } = await supabase.from('events').select('id');
    console.log(`Found ${dbEvts?.length || 0} events in DB.`);
}

runSync().catch(console.error);
