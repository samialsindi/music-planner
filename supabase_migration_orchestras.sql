-- Migration: Add Orchestras table, status and is_all_day columns to events

-- 1. Create Orchestras Table
CREATE TABLE orchestras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#2563eb',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE orchestras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access on orchestras" ON orchestras FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access on orchestras" ON orchestras FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access on orchestras" ON orchestras FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access on orchestras" ON orchestras FOR DELETE USING (true);

-- 2. Update Projects Table
ALTER TABLE projects ADD COLUMN orchestra_id UUID REFERENCES orchestras(id) ON DELETE CASCADE;

-- Insert a default orchestra for existing projects
INSERT INTO orchestras (id, name, color) VALUES (uuid_generate_v4(), 'Default Orchestra', '#2563eb')
ON CONFLICT DO NOTHING;

-- Update existing projects to link to default orchestra if null
UPDATE projects SET orchestra_id = (SELECT id FROM orchestras WHERE name = 'Default Orchestra' LIMIT 1) WHERE orchestra_id IS NULL;

-- 3. Update Events Table
ALTER TABLE events ADD COLUMN status TEXT CHECK (status IN ('pending', 'approved')) DEFAULT 'approved';
ALTER TABLE events ADD COLUMN is_all_day BOOLEAN DEFAULT false;

-- Add 'freeform' to source check constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_source_check;
ALTER TABLE events ADD CONSTRAINT events_source_check CHECK (source IN ('manual', 'gcal', 'email', 'freeform'));
