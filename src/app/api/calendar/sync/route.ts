import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { publishEvent, unpublishEvent, loadTokens, isConnected } from '@/lib/google';

export const dynamic = 'force-dynamic';

interface SyncRequest {
  projectId: string;
  action: 'accept' | 'decline' | 'reset';
}

/**
 * Push project-level accept/decline decisions to the dedicated
 * "Music Planner — Confirmed" Google Calendar. The source calendar is
 * never modified — declined events simply don't appear on the confirmed
 * calendar (or are removed if they were previously published).
 */
export async function POST(req: Request) {
  let body: SyncRequest;
  try {
    body = (await req.json()) as SyncRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body?.projectId || !body?.action) {
    return NextResponse.json({ error: 'projectId and action are required' }, { status: 400 });
  }

  const tokens = await loadTokens();
  if (!isConnected(tokens)) {
    return NextResponse.json(
      { message: 'Google Calendar not connected. Connect via /settings to enable bidirectional sync.', skipped: true },
      { status: 200 },
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('id, name, orchestras(name)')
    .eq('id', body.projectId)
    .maybeSingle();
  if (projErr || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const { data: events, error: evtErr } = await supabase
    .from('events')
    .select('id, title, start_time, end_time, is_all_day, is_declined, inferred_notes')
    .eq('project_id', body.projectId)
    .gte('start_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  if (evtErr) {
    return NextResponse.json({ error: evtErr.message }, { status: 500 });
  }

  const orchName = (project as any).orchestras?.name || '';
  const summaryPrefix = orchName ? `${orchName} — ${project.name}` : project.name;

  let published = 0;
  let removed = 0;
  const errors: string[] = [];

  for (const e of events || []) {
    try {
      if (body.action === 'accept' && !e.is_declined) {
        const result = await publishEvent({
          ourEventId: e.id,
          summary: `${summaryPrefix} — ${e.title}`,
          description: e.inferred_notes || undefined,
          start: new Date(e.start_time),
          end: new Date(e.end_time),
          isAllDay: !!e.is_all_day,
        }, req);
        if (result.ok) published++;
      } else {
        // decline or reset → ensure the event is not published
        const result = await unpublishEvent(e.id, req);
        if (result.ok && !('skipped' in result && result.skipped)) removed++;
      }
    } catch (err: any) {
      errors.push(`${e.id}: ${err.message || 'unknown error'}`);
    }
  }

  return NextResponse.json({
    ok: true,
    action: body.action,
    published,
    removed,
    errors: errors.length ? errors : undefined,
  });
}

export async function GET() {
  const tokens = await loadTokens();
  return NextResponse.json({
    connected: isConnected(tokens),
    confirmedCalendarId: tokens?.confirmed_calendar_id || null,
  });
}
