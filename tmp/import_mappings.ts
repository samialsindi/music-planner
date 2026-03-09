import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config({ path: path.resolve('c:/Users/samia/Documents/20260307 - Music gantt etc/music-planner/.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#facc15'
];

function getRandomColor() {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
}

async function applyMappings() {
  try {
    const filePath = 'c:/Users/samia/Documents/20260307 - Music gantt etc/music-planner/tmp/repaired_mappings.json';
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);

    if (!Array.isArray(data)) throw new Error('Expected an array of mappings');

    console.log(`Starting import of ${data.length} mappings...`);

    // Fetch existing projects and orchestras for lookup
    const { data: projects } = await supabase.from('projects').select('id, name, orchestra_id');
    const { data: orchestras } = await supabase.from('orchestras').select('id, name');

    const orchestrasLocal = orchestras || [];
    const projectsLocal = projects || [];

    let count = 0;
    for (const mapping of data) {
      // Support both currentOrchestra/Project (from export) and targetOrchestra/Project (from Gemini)
      const uid = mapping.uid;
      const targetOrchestra = mapping.targetOrchestra || mapping.currentOrchestra;
      const targetProject = mapping.targetProject || mapping.currentProject;

      if (!uid || !targetOrchestra || !targetProject) {
        console.warn(`Skipping invalid mapping: ${JSON.stringify(mapping)}`);
        continue;
      }

      // 1. Find or Create Orchestra
      let orchardId;
      const existingOrch = orchestrasLocal.find(o => o.name.toLowerCase() === targetOrchestra.toLowerCase());
      if (existingOrch) {
        orchardId = existingOrch.id;
      } else {
        console.log(`Creating orchestra: ${targetOrchestra}`);
        const { data: newOrch, error: orchErr } = await supabase
          .from('orchestras')
          .insert({ name: targetOrchestra, color: getRandomColor() })
          .select()
          .single();
        if (orchErr) throw orchErr;
        orchardId = newOrch.id;
        orchestrasLocal.push(newOrch);
      }

      // 2. Find or Create Project
      let projectId;
      const existingProj = projectsLocal.find(p => p.name.toLowerCase() === targetProject.toLowerCase() && p.orchestra_id === orchardId);
      if (existingProj) {
        projectId = existingProj.id;
      } else {
        console.log(`Creating project: ${targetProject} for orchestra: ${targetOrchestra}`);
        const { data: newProj, error: projErr } = await supabase
          .from('projects')
          .insert({ name: targetProject, orchestra_id: orchardId, color: getRandomColor(), is_active: true })
          .select()
          .single();
        if (projErr) throw projErr;
        projectId = newProj.id;
        projectsLocal.push(newProj);
      }

      // 3. Update all events with this UID
      const { error: updateErr } = await supabase
        .from('events')
        .update({ 
          project_id: projectId, 
          type: (targetOrchestra.toLowerCase() === 'personal' ? 'personal' : 'rehearsal') 
        })
        .eq('external_id', uid);
      
      if (updateErr) {
        console.error(`Error updating events for UID ${uid}:`, updateErr);
      } else {
        count++;
        if (count % 50 === 0) console.log(`Processed ${count} mappings...`);
      }
    }

    console.log(`Import complete! Succesfully mapped ${count} items.`);
  } catch (err) {
    console.error("Import failed:", err);
  }
}

applyMappings();
