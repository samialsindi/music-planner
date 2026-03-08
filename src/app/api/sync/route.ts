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

    // Wipe the old monolithic Google Calendar project and its events
    await supabase.from('projects').delete().eq('name', 'Google Calendar');

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

        // Try to extract orchestra and project from title (e.g. "BBC Symph chorus / FNOP" or "NY Phil - Beethoven 9th - Rehearsal 1")

        parsedEvents.push({
            id: `gcal-${uidMatch[1].trim()}`.toLowerCase(),
            rawTitle: title,
            type: eventType,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            is_all_day: isAllDay,
            status: 'approved',
            source: 'gcal',
            external_id: uidMatch[1].trim(),
            is_toggled: true
        });
    }

    if (parsedEvents.length > 0) {
      // 1. Extract Unique Titles for AI Processing
      const uniqueTitles = [...new Set(parsedEvents.map(e => e.rawTitle))];
      
      // 2. Build AI Prompt to cluster titles into Orchestrations and Projects
      const groqApiKey = process.env.GROQ_API_KEY;
      const geminiApiKey = process.env.GEMINI_API_KEY;
      let aiMapping: Record<string, { orchestraName: string, projectName: string, eventName: string }> = {};
      
      const systemPrompt = `You are a music scheduling assistant parsing raw calendar event strings. 
Your goal is to intelligently group related events into the same 'Project' and 'Orchestra'. 
For example, 'general rehearsal fnop' and 'concert fnop' should both be grouped under the Project 'FNOP'. 
If there is no obvious Orchestra, default to 'Google Calendar Sync'.
Output ONLY a JSON object with a single key "mappings" which is an object mapping the EXACT raw title string to an object with "orchestraName", "projectName", and "eventName" (which is the specific action, e.g. "General Rehearsal"). Ensure your response is strictly valid JSON without any markdown formatting.`;

      let aiSuccess = false;

      // Try Groq First
      if (groqApiKey && !aiSuccess) {
          try {
              console.log(`Sending ${uniqueTitles.length} unique titles to Groq for clustering...`);
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
              const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                      'Authorization': `Bearer ${groqApiKey}`,
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                      model: "llama-3.3-70b-versatile",
                      response_format: { type: "json_object" },
                      messages: [
                          { role: "system", content: systemPrompt },
                          { role: "user", content: JSON.stringify(uniqueTitles) }
                      ],
                      temperature: 0.1
                  }),
                  signal: controller.signal
              });
              clearTimeout(timeoutId);
              
              if (response.ok) {
                  const result = await response.json();
                  const content = JSON.parse(result.choices[0].message.content);
                  if (content.mappings) {
                      aiMapping = content.mappings;
                      aiSuccess = true;
                      console.log("Successfully clustered via Groq!");
                  }
              } else {
                  console.error("Groq API error:", await response.text());
              }
          } catch (e) {
              console.error("Failed to parse via Groq:", e);
          }
      }

      // Fallback to Gemini
      if (geminiApiKey && !aiSuccess) {
          try {
              console.log(`Falling back to Gemini for ${uniqueTitles.length} unique titles...`);
              const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      system_instruction: { parts: [{ text: systemPrompt }] },
                      contents: [{ parts: [{ text: JSON.stringify(uniqueTitles) }] }], 
                      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
                  })
              });
              
              if (response.ok) {
                  const result = await response.json();
                  const text = result.candidates[0].content.parts[0].text;
                  const content = JSON.parse(text);
                  if (content.mappings) {
                      aiMapping = content.mappings;
                      aiSuccess = true;
                      console.log("Successfully clustered via Gemini Fallback!");
                  }
              } else {
                  console.error("Gemini API error:", await response.text());
              }
          } catch (e) {
              console.error("Failed to parse via Gemini fallback:", e);
          }
      }

      // Apply mapping fallback
      for (const e of parsedEvents) {
          const mapping = aiMapping[e.rawTitle as string];
          if (mapping) {
              e._projName = mapping.projectName;
              e.title = mapping.eventName;
          } else {
               // Fallback basic parsing
              const parts = e.rawTitle.split(/\s*[-/]\s*/).filter((s: string) => s.trim().length > 0);
              let projectName = e.rawTitle.trim();
              let eventTitle = e.rawTitle.trim();
              if (parts.length >= 3) {
                  projectName = `${parts[0]} - ${parts[1]}`;
                  eventTitle = parts.slice(2).join(' - ');
              } else if (parts.length === 2) {
                  projectName = parts[0];
                  eventTitle = parts[1];
              } else {
                  projectName = parts[0];
                  eventTitle = parts[0];
              }
              e._projName = projectName;
              e.title = eventTitle;
          }
          delete e.rawTitle;
      }
      
      const uniqueProjs = new Map();
      for (const e of parsedEvents) {
         if (e._projName) {
            uniqueProjs.set(e._projName, { name: e._projName });
         }
      }

      // High Diversity Color Generation via HSL
      const size = uniqueProjs.size || 1;
      let colorIdx = 0;
      const getNextColor = () => {
         const hue = Math.floor((colorIdx++ * (360 / size)) % 360);
         return `hsl(${hue}, 70%, 60%)`;
      };

      for (const proj of uniqueProjs.values()) {
        const { data: existing } = await supabase.from('projects').select('id').eq('name', proj.name).maybeSingle();
        if (!existing) {
           await supabase.from('projects').insert({ ...proj, color: getNextColor() }).select().single();
        }
      }

      const { data: allProjs } = await supabase.from('projects').select('id, name');
      const projMap = new Map(allProjs?.map(p => [p.name, p.id]) || []);

      // Map project_id back to events
      for (const e of parsedEvents) {
         const pId = projMap.get(e._projName);
         if (pId) {
             e.project_id = pId;
         } else {
             console.warn(`Could not find project ID for ${e._projName}`);
         }
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

      const { error: upsertErr } = await supabase.from('events').upsert(uniqueEvents, { onConflict: 'id' });
      if (upsertErr) throw upsertErr;
    }

    return NextResponse.json({ success: true, count: parsedEvents.length });
  } catch (error: any) {
    console.error("GCal Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
