import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#facc15'
];

function getRandomColor() {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
}

export async function GET() {
  try {
    // Fetch all events that have an external_id (iCal UID)
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('external_id, title, project_id')
      .not('external_id', 'is', null);

    if (eventsError) throw eventsError;

    // Fetch projects and orchestras to provide names
    const { data: projects } = await supabase.from('projects').select('id, name, orchestra_id');
    const { data: orchestras } = await supabase.from('orchestras').select('id, name');

    const projMap = new Map(projects?.map(p => [p.id, p]));
    const orchMap = new Map(orchestras?.map(o => [o.id, o]));

    // Group by external_id
    const mapping: Record<string, any> = {};
    events?.forEach(e => {
      if (!mapping[e.external_id]) {
        const project = projMap.get(e.project_id);
        const orchestra = project ? orchMap.get(project.orchestra_id) : null;
        
        mapping[e.external_id] = {
          uid: e.external_id,
          exampleTitle: e.title,
          currentOrchestra: orchestra?.name || 'Personal',
          currentProject: project?.name || 'Personal'
        };
      }
    });

    return NextResponse.json(Object.values(mapping));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    if (!Array.isArray(data)) throw new Error('Expected an array of mappings');

    // Fetch existing projects and orchestras for lookup
    const { data: projects } = await supabase.from('projects').select('id, name, orchestra_id');
    const { data: orchestras } = await supabase.from('orchestras').select('id, name');

    for (const mapping of data) {
      const { uid, targetOrchestra, targetProject } = mapping;
      if (!uid || !targetOrchestra || !targetProject) continue;

      // 1. Find or Create Orchestra
      let orchardId;
      const existingOrch = orchestras?.find(o => o.name.toLowerCase() === targetOrchestra.toLowerCase());
      if (existingOrch) {
        orchardId = existingOrch.id;
      } else {
        const { data: newOrch, error: orchErr } = await supabase
          .from('orchestras')
          .insert({ name: targetOrchestra, color: getRandomColor(), is_active: true })
          .select()
          .single();
        if (orchErr) throw orchErr;
        orchardId = newOrch.id;
        orchestras?.push(newOrch); // Update local list for next iterations
      }

      // 2. Find or Create Project
      let projectId;
      const existingProj = projects?.find(p => p.name.toLowerCase() === targetProject.toLowerCase() && p.orchestra_id === orchardId);
      if (existingProj) {
        projectId = existingProj.id;
      } else {
        const { data: newProj, error: projErr } = await supabase
          .from('projects')
          .insert({ name: targetProject, orchestra_id: orchardId, color: getRandomColor(), is_active: true })
          .select()
          .single();
        if (projErr) throw projErr;
        projectId = newProj.id;
        projects?.push(newProj);
      }

      // 3. Update all events with this UID
      await supabase
        .from('events')
        .update({ project_id: projectId, type: (targetOrchestra.toLowerCase() === 'personal' ? 'personal' : 'rehearsal') })
        .eq('external_id', uid);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const { data: orchestras } = await supabase.from('orchestras').select('id');
    const { data: projects } = await supabase.from('projects').select('id');

    if (orchestras) {
      for (const orch of orchestras) {
        await supabase.from('orchestras').update({ color: getRandomColor() }).eq('id', orch.id);
      }
    }

    if (projects) {
      for (const proj of projects) {
        await supabase.from('projects').update({ color: getRandomColor() }).eq('id', proj.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
