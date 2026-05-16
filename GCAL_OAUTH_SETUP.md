# Google Calendar Sync Setup (OAuth)

The app reads upcoming events from your **source** Google Calendar and, when
you accept a project, publishes its events to a dedicated
**"Music Planner — Confirmed"** calendar. Your source calendar is never
modified or deleted.

## 1. Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project drop-down and select **New Project**.
3. Name it "Music Planner" and click **Create**.

## 2. Enable the Google Calendar API
1. In the sidebar, go to **APIs & Services** > **Library**.
2. Search for "Google Calendar API" and click **Enable**.

## 3. Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**.
2. Select **External** and click **Create**.
3. Fill in App name (Music Planner), user support email, developer contact email.
4. Click **Save and Continue**.
5. **Add or Remove Scopes** → add `https://www.googleapis.com/auth/calendar`.
6. Add your Google email as a **Test user** so you can sign in while the app is in Testing mode.

## 4. Create OAuth Credentials
1. Go to **APIs & Services** > **Credentials**.
2. **Create Credentials** > **OAuth client ID**.
3. Application type: **Web application**.
4. **Authorized redirect URIs** — add the callback URL for each environment you use:
   - Local dev: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://<your-domain>/api/auth/callback/google`
5. Click **Create** and copy the **Client ID** and **Client Secret**.

## 5. Environment Variables

Add to `.env.local` (and to your hosting provider for production):

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here

# One of these is required so the OAuth callback URL can be built.
# NEXTAUTH_URL is preferred; falls back to the request origin in dev.
NEXTAUTH_URL=http://localhost:3000

# Optional: override the redirect URI if it differs from
# `${NEXTAUTH_URL}/api/auth/callback/google` (e.g. behind a proxy).
# GOOGLE_OAUTH_REDIRECT_URI=https://example.com/api/auth/callback/google

# Optional: which calendar to read from. Defaults to 'primary'.
# GCAL_SOURCE_CALENDAR_ID=primary

# Legacy / fallback: app falls back to ICS scrape when OAuth isn't connected.
# GCAL_ICS_URL=https://calendar.google.com/calendar/ical/.../basic.ics
```

## 6. Apply the database migration

Run `supabase_migration_project_status.sql` in your Supabase SQL editor. It adds:
- `projects.status` (proposed/accepted/declined) and `projects.decided_at`
- `events.is_declined` (the column the code already references)
- `oauth_tokens` table for storing the Google access/refresh tokens

## 7. Connect

Visit `/settings` and click **Connect Google Calendar**. You'll be redirected
to Google's consent screen, then back to the app. On first publish, the app
creates the "Music Planner — Confirmed" calendar automatically.

## How sync works

- **Reads** — `/api/sync` lists events from the source calendar from
  `today - 7 days` onwards (no hardcoded date). Old events you've already
  pulled in stay in the local database; nothing in Google is deleted.
- **Writes** — `/api/calendar/sync` is called automatically when you click
  Accept / Decline / Reset on the Projects page. Accept publishes the
  project's events to the confirmed calendar; Decline / Reset removes them
  if they were previously published.
- **Incremental** — when supported, subsequent reads use Google's `syncToken`
  so only changes are fetched.
