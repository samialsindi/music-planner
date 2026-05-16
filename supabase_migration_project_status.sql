-- Project-level accept/decline decision status
-- Adds the canonical "Am I working on this?" status to projects
-- and the missing is_declined column the code already references on events.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS status TEXT
    CHECK (status IN ('proposed','accepted','declined'))
    DEFAULT 'proposed';

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS decided_at TIMESTAMP WITH TIME ZONE;

-- The events.is_declined column is referenced throughout the app
-- (declined page, sync route, store) but was never declared in the schema.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_declined BOOLEAN DEFAULT false;

-- OAuth token storage (single-user app, pattern matches user_settings.id=1)
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id INTEGER PRIMARY KEY DEFAULT 1,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  confirmed_calendar_id TEXT,
  sync_token TEXT,
  scope TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow anonymous all access on oauth_tokens" ON oauth_tokens FOR ALL USING (true) WITH CHECK (true);
