const fs = require('fs');

const file = './src/app/api/sync/route.ts';
let code = fs.readFileSync(file, 'utf8');

const search = `    if (parsedEvents.length > 0) {
      const { error: upsertErr } = await supabase.from('events').upsert(parsedEvents, { onConflict: 'id' });`;

const replace = `    if (parsedEvents.length > 0) {
      // Deduplicate events by id (keep the last one)
      const uniqueEvents = Object.values(
        parsedEvents.reduce((acc, event) => {
          acc[event.id] = event;
          return acc;
        }, {})
      );

      const { error: upsertErr } = await supabase.from('events').upsert(uniqueEvents, { onConflict: 'id' });`;

code = code.replace(search, replace);
fs.writeFileSync(file, code);
