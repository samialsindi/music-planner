-- Schema Setup for Music Planner App

-- 0. Create Orchestras Table
CREATE TABLE orchestras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#2563eb', -- Default blue
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Create Projects Table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orchestra_id UUID REFERENCES orchestras(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#9333ea', -- Default purple
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Events Table
CREATE TABLE events (
  id TEXT PRIMARY KEY, -- String ID to potentially match external GCal IDs easily
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('rehearsal', 'concert', 'personal', 'other')) DEFAULT 'rehearsal',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  status TEXT CHECK (status IN ('pending', 'approved')) DEFAULT 'approved',
  source TEXT CHECK (source IN ('manual', 'gcal', 'email', 'freeform')) DEFAULT 'manual',
  external_id TEXT, -- e.g., Google Calendar Event ID
  is_toggled BOOLEAN DEFAULT true,
  inferred_notes TEXT,
  timpani_required BOOLEAN,
  percussion_required BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Row Level Security (RLS) policies
-- For this personal app, we will enable RLS but allow anonymous access initially. 
-- In a real production app with Auth, you would restrict this to auth.uid().
ALTER TABLE orchestras ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access on orchestras" ON orchestras FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access on orchestras" ON orchestras FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access on orchestras" ON orchestras FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access on orchestras" ON orchestras FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access on projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access on projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access on projects" ON projects FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access on projects" ON projects FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access on events" ON events FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access on events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access on events" ON events FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access on events" ON events FOR DELETE USING (true);
