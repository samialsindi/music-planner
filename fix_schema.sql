-- Add missing columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending', 'approved')) DEFAULT 'approved';
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('manual', 'gcal', 'email', 'freeform')) DEFAULT 'manual';
ALTER TABLE events ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_toggled BOOLEAN DEFAULT true;
ALTER TABLE events ADD COLUMN IF NOT EXISTS inferred_notes TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS timpani_required BOOLEAN;
ALTER TABLE events ADD COLUMN IF NOT EXISTS percussion_required BOOLEAN;
