const fs = require('fs');

const path = 'src/app/api/sync/route.ts';
let content = fs.readFileSync(path, 'utf8');

// We need to instruct groq API or manually parse the title.
// However, the task says: "When pulling/re-importing events from the existing ICS feed (GCal), add logic to parse out the Orchestra and Project from the event titles if possible."
// Since calling LLM for every event during sync would be very slow and cost tokens,
// let's do a simple regex or split pattern on the title. Usually it's "Orchestra - Project - Event" or similar.

const parseLogic = `
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
            is_toggled: true
        });
`;

content = content.replace(
  /const isAllDay = [\s\S]*is_toggled: true\n        }\);/,
  parseLogic
);

// Add logic to bulk upsert orchestras and projects before events
const bulkUpsertLogic = `
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
         if (oId) uniqueProjs.set(\`\${oId}-\${e._projName}\`, { orchestra_id: oId, name: e._projName });
      }

      for (const proj of uniqueProjs.values()) {
        const { data: existing } = await supabase.from('projects').select('id').eq('name', proj.name).eq('orchestra_id', proj.orchestra_id).maybeSingle();
        if (!existing) {
           await supabase.from('projects').insert({ ...proj, color: '#4285F4' }).select().single();
        }
      }

      const { data: allProjs } = await supabase.from('projects').select('id, name, orchestra_id');
      const projMap = new Map(allProjs?.map(p => [\`\${p.orchestra_id}-\${p.name}\`, p.id]) || []);

      // Map project_id back to events
      for (const e of parsedEvents) {
         const oId = orchMap.get(e._orchName);
         const pId = projMap.get(\`\${oId}-\${e._projName}\`);
         e.project_id = pId || project!.id; // fallback to generic GCal project
         delete e._orchName;
         delete e._projName;
      }


      // Deduplicate events by id (keep the last one)
`;

content = content.replace(
  'if (parsedEvents.length > 0) {\n      // Deduplicate',
  bulkUpsertLogic
);


fs.writeFileSync(path, content, 'utf8');
