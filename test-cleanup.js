import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runCleanup() {
  console.log('Starting cleanup...');
  const { data: events, error: fetchErr } = await supabase.from('events').select('*');
  
  if (fetchErr) {
    console.error('Error fetching events:', fetchErr);
    return;
  }

  console.log(`Found ${events.length} events to process.`);
  
  let updatedCount = 0;
  for (const e of events) {
    let needsUpdate = false;
    let updateData: any = {};

    // In JS Date parsing, assume ISO string
    let d = new Date(e.start_time);
    
    // Convert all-day rehearsals to 7-10pm
    if (e.is_all_day && e.type !== 'personal') {
      const newStart = new Date(e.start_time);
      newStart.setUTCHours(19, 0, 0, 0);

      const newEnd = new Date(e.start_time);
      newEnd.setUTCHours(22, 0, 0, 0);

      updateData = {
        is_all_day: false,
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        type: 'rehearsal'
      };
      needsUpdate = true;
    }

    // Abbreviate title
    if (e.title && (e.title.toLowerCase().includes('haverhill silver band') || e.title.includes('Haverhill'))) {
      updateData = {
        ...updateData,
        title: e.title.replace(/Haverhill Silver Band/i, 'HSB')
      };
      needsUpdate = true;
    }

    if (needsUpdate) {
      console.log(`Updating event: ${e.title} -> ${updateData.title || e.title}`);
      const { error: updateErr } = await supabase.from('events').update(updateData).eq('id', e.id);
      if (updateErr) {
        console.error(`Failed to update ${e.id}:`, updateErr);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Successfully updated ${updatedCount} events!`);
}

runCleanup();
