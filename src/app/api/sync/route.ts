import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rrulestr } from 'rrule';
import { detectOrchestra, cleanEventTitle } from '@/lib/deontologies';
import { listSourceEvents, loadTokens, isConnected, saveTokens } from '@/lib/google';

export const dynamic = 'force-dynamic';

interface RawEvent {
  title: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  uid: string;
  recurrenceIndex?: number;
}

const READ_LOOKBACK_DAYS = 7;
const READ_LOOKAHEAD_YEARS = 2;
const MIN_DURATION_MS = 30 * 60 * 1000;

function readWindow() {
  const timeMin = new Date(Date.now() - READ_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const timeMax = new Date(Date.now() + READ_LOOKAHEAD_YEARS * 365 * 24 * 60 * 60 * 1000);
  return { timeMin, timeMax };
}

function findIcsUrl(): string | null {
  const explicit = process.env.GCAL_ICS_URL;
  if (explicit) return explicit;
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v !== 'string') continue;
    const upper = k.toUpperCase();
    if ((upper.includes('CAL') || upper.includes('ICS') || upper.includes('URL'))
        && (v.includes('calendar.google.com') || v.endsWith('.ics'))) {
      return v;
    }
  }
  return null;
}

function parseICSDate(s: string): Date {
  if (s.length === 8) {
    return new Date(`${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}T00:00:00Z`);
  }
  return new Date(
    `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}T` +
    `${s.substring(9, 11)}:${s.substring(11, 13)}:${s.substring(13, 15)}Z`,
  );
}

async function fetchViaICS(url: string, timeMin: Date, timeMax: Date): Promise<RawEvent[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch ICS file');
  const ics = await response.text();
  const blocks = ics.split('BEGIN:VEVENT');
  const out: RawEvent[] = [];

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const summaryMatch = block.match(/SUMMARY:(.*)\r?\n/);
    const dtstartMatch = block.match(/DTSTART(?:;[^:]+)?:(.*)\r?\n/);
    const dtendMatch = block.match(/DTEND(?:;[^:]+)?:(.*)\r?\n/);
    const uidMatch = block.match(/UID:(.*)\r?\n/);
    if (!dtstartMatch || !uidMatch) continue;

    const startDate = parseICSDate(dtstartMatch[1]);
    const isAllDay = dtstartMatch[1].length === 8;
    if (startDate < timeMin) continue;

    let endDate = dtendMatch ? parseICSDate(dtendMatch[1]) : new Date(startDate.getTime() + 60 * 60 * 1000);
    if (isAllDay) {
      startDate.setUTCHours(12, 0, 0, 0);
      endDate = new Date(endDate.getTime() - 12 * 60 * 60 * 1000);
    }

    const title = summaryMatch ? summaryMatch[1].trim() : 'Busy';
    const rruleMatch = block.match(/RRULE:(.*)\r?\n/);
    const exdateMatches = block.match(/EXDATE(?:;[^:]+)?:(.*)\r?\n/g);
    const exdates = new Set<string>();
    exdateMatches?.forEach(m => {
      m.split(':')[1].trim().split(',').forEach(d => exdates.add(d.split('T')[0]));
    });

    const duration = endDate.getTime() - startDate.getTime();
    const uid = uidMatch[1].trim();

    if (rruleMatch) {
      try {
        const rule = rrulestr(`DTSTART:${dtstartMatch[1].trim()}\nRRULE:${rruleMatch[1].trim()}`);
        const occurrences = rule.between(startDate, timeMax, true);
        occurrences.forEach((occStart, idx) => {
          const occDateStr = occStart.toISOString().split('T')[0].replace(/-/g, '');
          if (exdates.has(occDateStr)) return;
          out.push({
            title, isAllDay, uid, recurrenceIndex: idx,
            start: occStart,
            end: new Date(occStart.getTime() + duration),
          });
        });
      } catch {
        out.push({ title, isAllDay, uid, start: startDate, end: endDate });
      }
    } else {
      out.push({ title, isAllDay, uid, start: startDate, end: endDate });
    }
  }
  return out;
}

async function fetchViaOAuth(req: Request, timeMin: Date, timeMax: Date): Promise<RawEvent[] | null> {
  const tokens = await loadTokens();
  if (!isConnected(tokens)) return null;

  // Try incremental sync first when we have a token; fall back to full list on 410.
  let result = await listSourceEvents({ timeMin, timeMax, syncToken: tokens?.sync_token || null }, req);
  if (!result.ok && result.reason === 'sync_token_expired') {
    result = await listSourceEvents({ timeMin, timeMax, syncToken: null }, req);
  }
  if (!result.ok) return null;
  if (result.nextSyncToken) await saveTokens({ sync_token: result.nextSyncToken });

  const out: RawEvent[] = [];
  for (const e of result.items) {
    if (!e.id || e.status === 'cancelled') continue;
    const title = e.summary || 'Busy';
    const isAllDay = !!e.start?.date;
    const start = e.start?.dateTime
      ? new Date(e.start.dateTime)
      : e.start?.date
        ? (() => { const d = new Date(`${e.start!.date}T12:00:00Z`); return d; })()
        : null;
    const end = e.end?.dateTime
      ? new Date(e.end.dateTime)
      : e.end?.date
        ? (() => { const d = new Date(`${e.end!.date}T12:00:00Z`); return new Date(d.getTime() - 12 * 60 * 60 * 1000); })()
        : null;
    if (!start || !end) continue;
    if (start < timeMin) continue;
    out.push({ title, start, end, isAllDay, uid: e.iCalUID || e.id });
  }
  return out;
}

function classifyType(title: string, isAllDay: boolean): { type: 'rehearsal' | 'concert' | 'other'; finalStart: Date; finalEnd: Date; finalIsAllDay: boolean } | null {
  let type: 'rehearsal' | 'concert' | 'other' = 'other';
  const lower = title.toLowerCase();
  if (lower.includes('rehearsal') || lower.includes('reh')) type = 'rehearsal';
  else if (lower.includes('concert') || lower.includes('performance') || lower.includes('show')) type = 'concert';

  return { type, finalStart: new Date(), finalEnd: new Date(), finalIsAllDay: isAllDay };
}

function mapRawToEventRow(raw: RawEvent): any | null {
  const title = raw.title;
  const lower = title.toLowerCase();

  // Skip noisy all-day repeats
  const isMotDue = title.toUpperCase().includes('MOT DUE');
  if (raw.isAllDay && isMotDue) return null;

  let eventType: 'rehearsal' | 'concert' | 'other' = 'other';
  if (lower.includes('rehearsal') || lower.includes('reh')) eventType = 'rehearsal';
  else if (lower.includes('concert') || lower.includes('performance') || lower.includes('show')) eventType = 'concert';

  // Drop sub-30-min events that are not all-day
  if (!raw.isAllDay && raw.end.getTime() - raw.start.getTime() <= MIN_DURATION_MS) return null;

  let orchName = 'Personal';
  let projName = 'Personal';
  let eventTitle = title.trim();

  const detected = detectOrchestra(title);
  if (detected) {
    orchName = detected;
    eventTitle = cleanEventTitle(title, detected);
    const generic = ['rehearsal', 'reh', 'concert', 'performance', 'show', 'session', 'gig'];
    projName = (!eventTitle || generic.some(g => eventTitle.toLowerCase() === g)) ? detected : eventTitle;
  } else {
    const parts = title.split(/\s+[-/]\s+/).filter(s => s.trim().length > 0);
    if (parts.length >= 3) { orchName = parts[0]; projName = parts[1]; eventTitle = parts.slice(2).join(' - '); }
    else if (parts.length === 2) { orchName = parts[0]; projName = parts[0]; eventTitle = parts[1]; }
    else if (parts.length === 1) {
      eventTitle = parts[0];
      const firstWord = eventTitle.split(' ')[0].toUpperCase();
      if (['CGC', 'HSB'].includes(firstWord)) { orchName = firstWord; projName = firstWord; }
    }
  }

  if (orchName.toLowerCase().includes('haverhill silver band') || orchName.toLowerCase() === 'hsb') {
    orchName = 'HSB';
  }

  // All-day rehearsals → 7pm–10pm local-day window
  let finalIsAllDay = raw.isAllDay;
  let finalStart = raw.start;
  let finalEnd = raw.end;
  if (raw.isAllDay && eventType === 'rehearsal') {
    finalIsAllDay = false;
    finalStart = new Date(raw.start);
    finalStart.setUTCHours(19, 0, 0, 0);
    finalEnd = new Date(raw.start);
    finalEnd.setUTCHours(22, 0, 0, 0);
  }

  const id = raw.recurrenceIndex !== undefined
    ? `gcal-${raw.uid}-${raw.recurrenceIndex}`.toLowerCase()
    : `gcal-${raw.uid}`.toLowerCase();

  return {
    _orchName: orchName,
    _projName: projName,
    _defaultType: eventType,
    id,
    title: eventTitle,
    start_time: finalStart.toISOString(),
    end_time: finalEnd.toISOString(),
    is_all_day: finalIsAllDay,
    status: 'approved',
    source: 'gcal',
    external_id: raw.uid,
  };
}

export async function GET(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  try {
    // Prune audit log entries older than 30 days; preserve recent undo history across syncs.
    const cutoffAudit = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('audit_log').delete().lt('created_at', cutoffAudit);

    // Clean up old monolithic catch-all rows from earlier versions. Safe no-op if absent.
    await supabase.from('projects').delete().eq('name', 'Google Calendar Sync');
    await supabase.from('orchestras').delete().eq('name', 'Google Calendar Sync');

    const { timeMin, timeMax } = readWindow();

    // Prefer OAuth API when connected; fall back to ICS scrape.
    let rawEvents: RawEvent[] | null = await fetchViaOAuth(req, timeMin, timeMax);
    let source: 'oauth' | 'ics' = 'oauth';
    if (!rawEvents) {
      const icsUrl = findIcsUrl();
      if (!icsUrl) {
        return NextResponse.json({
          error: 'No source configured. Connect Google Calendar via /settings or set GCAL_ICS_URL.',
        }, { status: 400 });
      }
      rawEvents = await fetchViaICS(icsUrl, timeMin, timeMax);
      source = 'ics';
    }

    // Map to internal event rows
    const parsedEvents: any[] = [];
    for (const raw of rawEvents) {
      const row = mapRawToEventRow(raw);
      if (row) parsedEvents.push(row);
    }

    if (parsedEvents.length === 0) {
      return NextResponse.json({ success: true, count: 0, source });
    }

    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f43f5e'];
    let colorIdx = 0;
    const nextColor = () => colors[colorIdx++ % colors.length];

    // Ensure orchestras exist
    const uniqueOrchNames = [...new Set(parsedEvents.map(e => e._orchName))];
    for (const name of uniqueOrchNames) {
      await supabase.from('orchestras').insert({ name, color: nextColor() })
        .then(r => r.error && r.error.code !== '23505' ? console.error(r.error) : null);
    }
    const { data: allOrchs } = await supabase.from('orchestras').select('id, name').limit(5000);
    const orchMap = new Map(allOrchs?.map(o => [o.name, o.id]) || []);

    // Ensure projects exist (with default status='proposed' from schema)
    const uniqueProjs = new Map<string, { orchestra_id: string; name: string }>();
    for (const e of parsedEvents) {
      const oId = orchMap.get(e._orchName);
      if (oId) uniqueProjs.set(`${oId}-${e._projName}`, { orchestra_id: oId, name: e._projName });
    }
    for (const proj of uniqueProjs.values()) {
      const { data: existing } = await supabase.from('projects')
        .select('id').eq('name', proj.name).eq('orchestra_id', proj.orchestra_id).maybeSingle();
      if (!existing) {
        await supabase.from('projects').insert({ ...proj, color: nextColor() });
      }
    }
    const { data: allProjs } = await supabase.from('projects').select('id, name, orchestra_id').limit(5000);
    const projMap = new Map(allProjs?.map(p => [`${p.orchestra_id}-${p.name}`, p.id]) || []);

    // Resolve project_id and deduplicate
    const uniqueEventsMap = new Map<string, any>();
    for (const e of parsedEvents) {
      const oId = orchMap.get(e._orchName);
      const pId = projMap.get(`${oId}-${e._projName}`);
      if (!pId) continue;
      const start = new Date(e.start_time);
      const end = new Date(e.end_time);
      const dur = end.getTime() - start.getTime();
      if (start < timeMin) continue;
      if (dur <= MIN_DURATION_MS && !e.is_all_day) continue;
      const { _orchName, _projName, _defaultType, ...row } = e;
      uniqueEventsMap.set(e.id, { ...row, project_id: pId, _defaultType });
    }
    const uniqueEvents = Array.from(uniqueEventsMap.values());

    // Past events before today at 13:30 are immutable if they already exist.
    const threshold = new Date();
    threshold.setHours(13, 30, 0, 0);
    const { data: existingEventsData } = await supabase.from('events').select('id').limit(10000);
    const existingEventIds = new Set(existingEventsData?.map((e: any) => e.id) || []);

    const toInsert: any[] = [];
    const toUpdate: any[] = [];
    for (const e of uniqueEvents) {
      if (new Date(e.start_time) < threshold && existingEventIds.has(e.id)) continue;
      const defaultType = e._defaultType;
      delete e._defaultType;
      if (existingEventIds.has(e.id)) {
        // Never overwrite user-mutable fields (type, is_declined, is_toggled, project_id reassignments).
        toUpdate.push({
          id: e.id, title: e.title, start_time: e.start_time, end_time: e.end_time,
          is_all_day: e.is_all_day, status: e.status, source: e.source, external_id: e.external_id,
        });
      } else {
        toInsert.push({ ...e, type: defaultType, is_toggled: true, is_declined: false });
      }
    }

    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase.from('events').insert(toInsert);
      if (insertErr) throw insertErr;
    }
    for (const row of toUpdate) {
      const { id, ...patch } = row;
      await supabase.from('events').update(patch).eq('id', id);
    }

    return NextResponse.json({
      success: true,
      source,
      count: parsedEvents.length,
      inserted: toInsert.length,
      updated: toUpdate.length,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
