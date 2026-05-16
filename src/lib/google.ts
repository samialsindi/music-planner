import { google, calendar_v3 } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const REDIRECT_PATH = '/api/auth/callback/google';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];
const CONFIRMED_CALENDAR_SUMMARY = 'Music Planner — Confirmed';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

export function getRedirectUri(req?: Request): string {
  const explicit = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (explicit) return explicit;
  const base = process.env.NEXTAUTH_URL
    || (req && new URL(req.url).origin)
    || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}${REDIRECT_PATH}`;
}

export function makeOAuthClient(req?: Request) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri(req),
  );
}

export function buildAuthUrl(req?: Request): string {
  const oauth = makeOAuthClient(req);
  return oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
}

interface StoredTokens {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  scope: string | null;
  confirmed_calendar_id: string | null;
  sync_token: string | null;
}

export async function loadTokens(): Promise<StoredTokens | null> {
  const supabase = adminSupabase();
  const { data, error } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) return null;
  return data as StoredTokens;
}

export async function saveTokens(patch: Partial<StoredTokens>) {
  const supabase = adminSupabase();
  // Upsert with id=1 (single-user app)
  await supabase
    .from('oauth_tokens')
    .upsert({ id: 1, provider: 'google', updated_at: new Date().toISOString(), ...patch });
}

export function isConnected(tokens: StoredTokens | null): boolean {
  return !!(tokens && (tokens.access_token || tokens.refresh_token));
}

export async function getAuthorizedClient(req?: Request) {
  const tokens = await loadTokens();
  if (!isConnected(tokens)) return null;
  const oauth = makeOAuthClient(req);
  oauth.setCredentials({
    access_token: tokens!.access_token || undefined,
    refresh_token: tokens!.refresh_token || undefined,
    expiry_date: tokens!.expires_at ? new Date(tokens!.expires_at).getTime() : undefined,
    scope: tokens!.scope || undefined,
  });
  // Persist refreshed tokens
  oauth.on('tokens', (t) => {
    saveTokens({
      access_token: t.access_token ?? tokens!.access_token,
      refresh_token: t.refresh_token ?? tokens!.refresh_token,
      expires_at: t.expiry_date ? new Date(t.expiry_date).toISOString() : tokens!.expires_at,
      scope: t.scope ?? tokens!.scope,
    }).catch(() => {});
  });
  return oauth;
}

export async function ensureConfirmedCalendar(req?: Request): Promise<string | null> {
  const auth = await getAuthorizedClient(req);
  if (!auth) return null;
  const tokens = await loadTokens();
  if (tokens?.confirmed_calendar_id) return tokens.confirmed_calendar_id;

  const cal = google.calendar({ version: 'v3', auth });
  // Look for an existing calendar with the magic name before creating a new one.
  const list = await cal.calendarList.list({ maxResults: 250 });
  const existing = list.data.items?.find(c => c.summary === CONFIRMED_CALENDAR_SUMMARY);
  let id = existing?.id || null;
  if (!id) {
    const created = await cal.calendars.insert({
      requestBody: { summary: CONFIRMED_CALENDAR_SUMMARY, timeZone: 'UTC' },
    });
    id = created.data.id || null;
  }
  if (id) await saveTokens({ confirmed_calendar_id: id });
  return id;
}

const MUSIC_PLANNER_KEY = 'musicPlannerEventId';

export async function publishEvent(params: {
  ourEventId: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  isAllDay?: boolean;
}, req?: Request) {
  const auth = await getAuthorizedClient(req);
  if (!auth) return { ok: false, reason: 'not_connected' as const };
  const calendarId = await ensureConfirmedCalendar(req);
  if (!calendarId) return { ok: false, reason: 'no_calendar' as const };

  const cal = google.calendar({ version: 'v3', auth });
  const existing = await findExistingPublishedEvent(cal, calendarId, params.ourEventId);

  const body: calendar_v3.Schema$Event = {
    summary: params.summary,
    description: params.description,
    extendedProperties: { private: { [MUSIC_PLANNER_KEY]: params.ourEventId } },
    ...(params.isAllDay
      ? {
          start: { date: params.start.toISOString().slice(0, 10) },
          end: { date: new Date(params.start.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10) },
        }
      : {
          start: { dateTime: params.start.toISOString() },
          end: { dateTime: params.end.toISOString() },
        }),
  };

  if (existing) {
    await cal.events.patch({ calendarId, eventId: existing.id!, requestBody: body });
    return { ok: true as const, id: existing.id! };
  }
  const created = await cal.events.insert({ calendarId, requestBody: body });
  return { ok: true as const, id: created.data.id! };
}

export async function unpublishEvent(ourEventId: string, req?: Request) {
  const auth = await getAuthorizedClient(req);
  if (!auth) return { ok: false, reason: 'not_connected' as const };
  const tokens = await loadTokens();
  const calendarId = tokens?.confirmed_calendar_id;
  if (!calendarId) return { ok: true as const, skipped: true };

  const cal = google.calendar({ version: 'v3', auth });
  const existing = await findExistingPublishedEvent(cal, calendarId, ourEventId);
  if (!existing) return { ok: true as const, skipped: true };
  await cal.events.delete({ calendarId, eventId: existing.id! });
  return { ok: true as const };
}

async function findExistingPublishedEvent(
  cal: calendar_v3.Calendar,
  calendarId: string,
  ourEventId: string,
): Promise<calendar_v3.Schema$Event | null> {
  const res = await cal.events.list({
    calendarId,
    privateExtendedProperty: [`${MUSIC_PLANNER_KEY}=${ourEventId}`],
    maxResults: 5,
    showDeleted: false,
  });
  return res.data.items?.[0] || null;
}

export async function listSourceEvents(opts: {
  calendarId?: string;
  timeMin?: Date;
  timeMax?: Date;
  syncToken?: string | null;
}, req?: Request) {
  const auth = await getAuthorizedClient(req);
  if (!auth) return { ok: false as const, reason: 'not_connected' as const };
  const cal = google.calendar({ version: 'v3', auth });
  const calendarId = opts.calendarId || process.env.GCAL_SOURCE_CALENDAR_ID || 'primary';

  const items: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;
  try {
    do {
      const res: any = await cal.events.list({
        calendarId,
        singleEvents: true,
        showDeleted: true,
        maxResults: 2500,
        pageToken,
        ...(opts.syncToken
          ? { syncToken: opts.syncToken }
          : {
              timeMin: (opts.timeMin || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).toISOString(),
              timeMax: (opts.timeMax || new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)).toISOString(),
              orderBy: 'startTime',
            }),
      });
      (res.data.items || []).forEach((e: calendar_v3.Schema$Event) => items.push(e));
      pageToken = res.data.nextPageToken || undefined;
      if (res.data.nextSyncToken) nextSyncToken = res.data.nextSyncToken;
    } while (pageToken);
    return { ok: true as const, items, nextSyncToken };
  } catch (err: any) {
    // 410 Gone → sync token expired, caller should retry without it.
    if (err?.code === 410) return { ok: false as const, reason: 'sync_token_expired' as const };
    throw err;
  }
}
