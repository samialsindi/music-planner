import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('*, projects(name, orchestras(name))')
      .eq('status', 'approved');

    if (error) throw error;

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Music Planner//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const formatICSAllDay = (date: Date) => {
      return date.toISOString().split('T')[0].replace(/-/g, '');
    };

    events?.forEach(event => {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      const now = new Date();
      const projName = event.projects?.name || 'Project';
      const orchName = event.projects?.orchestras?.name || 'Orchestra';

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${event.id}@musicplanner`);
      icsContent.push(`DTSTAMP:${formatICSDate(now)}`);

      if (event.is_all_day) {
        icsContent.push(`DTSTART;VALUE=DATE:${formatICSAllDay(start)}`);
        // For all day events, end date is exclusive (next day)
        const nextDay = new Date(start);
        nextDay.setDate(nextDay.getDate() + 1);
        icsContent.push(`DTEND;VALUE=DATE:${formatICSAllDay(nextDay)}`);
      } else {
        icsContent.push(`DTSTART:${formatICSDate(start)}`);
        icsContent.push(`DTEND:${formatICSDate(end)}`);
      }

      icsContent.push(`SUMMARY:${orchName} - ${projName} - ${event.title}`);
      if (event.inferred_notes) {
        icsContent.push(`DESCRIPTION:${event.inferred_notes}`);
      }
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    return new NextResponse(icsContent.join('\r\n'), {
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': 'attachment; filename="music_planner.ics"'
      }
    });

  } catch (error: any) {
    console.error("Export Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
