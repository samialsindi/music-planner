const fs = require('fs');
let code = fs.readFileSync('src/app/api/sync/route.ts', 'utf8');

if (!code.includes("import { RRule, rrulestr } from 'rrule';")) {
    code = code.replace("import { createClient } from '@supabase/supabase-js';",
    "import { createClient } from '@supabase/supabase-js';\nimport { rrulestr } from 'rrule';");
}

const replaceTarget = `            const title = summaryMatch ? summaryMatch[1].trim() : 'Busy';
            const hasRRule = block.includes('RRULE');
            const isDailyRepeat = block.includes('RRULE') && block.includes('FREQ=DAILY');
            const isMotDue = title.toUpperCase().includes('MOT DUE');
            if (isAllDay && (isDailyRepeat || isMotDue)) continue;


            let eventType = 'other';
            const lowerTitle = title.toLowerCase();
            if (lowerTitle.includes('rehearsal') || lowerTitle.includes('reh')) {
                eventType = 'rehearsal';
            } else if (lowerTitle.includes('concert') || lowerTitle.includes('performance') || lowerTitle.includes('show')) {
                eventType = 'concert';
            }

            // Try to extract orchestra and project from title (e.g. "BBC Symph chorus / FNOP" or "NY Phil - Beethoven 9th - Rehearsal 1")
            let orchName = 'Google Calendar Sync';
            let projName = title.trim();
            let eventTitle = title.trim();

            // Split by either a hyphen or a forward slash surrounded by optional spaces
            const parts = title.split(/\\s*[-/]\\s*/).filter(s => s.trim().length > 0);

            if (parts.length >= 3) {
                orchName = parts[0];
                projName = parts[1];
                eventTitle = parts.slice(2).join(' - ');
            } else if (parts.length === 2) {
                orchName = parts[0];
                projName = parts[0];
                eventTitle = parts[1];
            }

            parsedEvents.push({
                id: \`gcal-\${uidMatch[1].trim()}\`.toLowerCase(),
                _orchName: orchName,
                _projName: projName,
                title: eventTitle,
                type: eventType,
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                is_all_day: isAllDay,
                status: 'approved',
                source: 'gcal',
                external_id: uidMatch[1].trim(),
                is_toggled: true,
                is_declined: false
            });`;

const replacement = `            const title = summaryMatch ? summaryMatch[1].trim() : 'Busy';
            const rruleMatch = block.match(/RRULE:(.*)\\r?\\n/);
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

            let orchName = 'Google Calendar Sync';
            let projName = title.trim();
            let eventTitle = title.trim();

            const parts = title.split(/\\s*[-/]\\s*/).filter(s => s.trim().length > 0);
            if (parts.length >= 3) {
                orchName = parts[0];
                projName = parts[1];
                eventTitle = parts.slice(2).join(' - ');
            } else if (parts.length === 2) {
                orchName = parts[0];
                projName = parts[0];
                eventTitle = parts[1];
            }

            const baseEvent = {
                _orchName: orchName,
                _projName: projName,
                title: eventTitle,
                type: eventType,
                is_all_day: isAllDay,
                status: 'approved',
                source: 'gcal',
                external_id: uidMatch[1].trim(),
                is_toggled: true,
                is_declined: false
            };

            const duration = endDate.getTime() - startDate.getTime();

            if (rruleMatch) {
                try {
                    // Extract exact string without trailing carriage return
                    const rruleStr = rruleMatch[1].trim();
                    // Setup rrule with the start date (ignoring timezone issues by relying on rrule's string parsing)
                    const rule = rrulestr(\`DTSTART:\${dtstartMatch[1].trim()}\\nRRULE:\${rruleStr}\`);

                    // Generate occurrences until end of 2027
                    const untilDate = new Date('2027-12-31T23:59:59Z');
                    const occurrences = rule.between(startDate, untilDate, true);

                    for (let j = 0; j < occurrences.length; j++) {
                        const occStart = occurrences[j];
                        const occEnd = new Date(occStart.getTime() + duration);
                        parsedEvents.push({
                            ...baseEvent,
                            id: \`gcal-\${uidMatch[1].trim()}-\${j}\`.toLowerCase(),
                            start_time: occStart.toISOString(),
                            end_time: occEnd.toISOString()
                        });
                    }
                } catch (e) {
                    console.error('Error parsing RRULE for event:', title, e);
                    // Fallback to single event
                    parsedEvents.push({
                        ...baseEvent,
                        id: \`gcal-\${uidMatch[1].trim()}\`.toLowerCase(),
                        start_time: startDate.toISOString(),
                        end_time: endDate.toISOString()
                    });
                }
            } else {
                parsedEvents.push({
                    ...baseEvent,
                    id: \`gcal-\${uidMatch[1].trim()}\`.toLowerCase(),
                    start_time: startDate.toISOString(),
                    end_time: endDate.toISOString()
                });
            }`;

if (code.includes(replaceTarget)) {
    code = code.replace(replaceTarget, replacement);
    fs.writeFileSync('src/app/api/sync/route.ts', code);
    console.log("Successfully patched sync route with RRULE logic");
} else {
    console.log("Could not find exact text block to replace in route.ts");
}
