const fs = require('fs');

const file = 'src/app/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const cleanupFunction = `
  const handleCleanUp = async () => {
    setIsProcessing(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

      const updates = [];
      const newHiddenIds = [...settings.hiddenEventIds];
      let updatedCount = 0;

      // 1. Process events ending before 12pm
      for (const e of events) {
        if (!e) continue;
        const endHour = e.endTime.getHours();
        const endMinute = e.endTime.getMinutes();
        const endTimeFloat = endHour + (endMinute / 60);

        if (endTimeFloat <= 12 && !e.isAllDay) {
          // It ends before or at 12pm
          updates.push(
            supabase.from('events').update({ type: 'personal' }).eq('id', e.id)
          );
          if (!newHiddenIds.includes(e.id)) {
            newHiddenIds.push(e.id);
          }
          updatedCount++;
        }
      }

      // 2. Process all-day events that are NOT personal
      for (const e of events) {
        if (!e) continue;
        if (e.isAllDay && e.type !== 'personal') {
          // Convert to 7pm - 10pm same day
          const newStart = new Date(e.startTime);
          newStart.setHours(19, 0, 0, 0); // 7 PM

          const newEnd = new Date(e.startTime);
          newEnd.setHours(22, 0, 0, 0); // 10 PM

          updates.push(
            supabase.from('events').update({
              is_all_day: false,
              start_time: newStart.toISOString(),
              end_time: newEnd.toISOString(),
              type: 'rehearsal' // Default to rehearsal as requested "rehearsal 7-10pm"
            }).eq('id', e.id)
          );
          updatedCount++;
        }
      }

      if (updates.length > 0) {
        await Promise.all(updates);
        await supabase.from('user_settings').update({ hidden_event_ids: newHiddenIds }).eq('id', 1);
        alert(\`Clean up complete! Updated \${updatedCount} events.\`);
        window.location.reload();
      } else {
        alert('No events needed cleaning up.');
      }

    } catch (err) {
      console.error(err);
      alert('Error during clean up.');
    } finally {
      setIsProcessing(false);
    }
  };
`;

// Insert the function before return (
code = code.replace(/return \(/, cleanupFunction + '\n  return (');

// Add the button
const buttonHtml = `
              <button
                onClick={handleCleanUp}
                disabled={isProcessing}
                className={\`px-4 py-2 text-sm rounded-xl transition-colors font-medium whitespace-nowrap \${
                  isProcessing
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'glass-panel text-orange-400 border border-orange-500/30 hover:bg-orange-500/10'
                }\`}
              >
                🧹 Clean Up
              </button>`;

code = code.replace(/<button\s+onClick=\{handleSync\}/, buttonHtml + '\n              <button\n                onClick={handleSync}');

fs.writeFileSync(file, code);
