const fs = require('fs');
let code = fs.readFileSync('src/components/CalendarView.tsx', 'utf8');

const targetBtn = `              <button
                onClick={async () => {
                  const updated = { ...editingEvent.resource, isDeclined: !editingEvent.resource.isDeclined };
                  useAppStore.getState().updateEvent(updated);
                  setEditingEvent(null);
                  const { createClient } = await import("@supabase/supabase-js");
                  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
                  await supabase.from("events").update({ is_declined: updated.isDeclined }).eq("id", updated.id);
                }}
                className="text-orange-400 text-sm font-medium hover:text-orange-300 transition-colors bg-orange-500/10 px-3 py-1.5 rounded"
              >
                {editingEvent.resource.isDeclined ? "Can Attend" : "Can't Attend"}
              </button>`;

const replacementBtn = `              <button
                onClick={async () => {
                  const updated = { ...editingEvent.resource, isDeclined: !editingEvent.resource.isDeclined };
                  useAppStore.getState().updateEvent(updated);
                  setEditingEvent(null);
                  const { createClient } = await import("@supabase/supabase-js");
                  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
                  await supabase.from("events").update({ is_declined: updated.isDeclined }).eq("id", updated.id);
                }}
                className="text-orange-400 text-sm font-medium hover:text-orange-300 transition-colors bg-orange-500/10 px-3 py-1.5 rounded"
              >
                {editingEvent.resource.isDeclined ? "Can Attend" : "Can't Attend"}
              </button>

              <button
                onClick={async () => {
                  const { createClient } = await import("@supabase/supabase-js");
                  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

                  // 1. Get or Create "Personal" Orchestra
                  let orchId = '';
                  const { data: orchs } = await supabase.from('orchestras').select('id, name').eq('name', 'Personal').maybeSingle();
                  if (orchs) {
                      orchId = orchs.id;
                  } else {
                      const { data: newOrch } = await supabase.from('orchestras').insert({ name: 'Personal', color: '#64748b' }).select().single();
                      if (newOrch) {
                        orchId = newOrch.id;
                        useAppStore.getState().setOrchestras([...useAppStore.getState().orchestras, { id: newOrch.id, name: 'Personal', color: '#64748b', isActive: true }]);
                      }
                  }

                  // 2. Get or Create "Personal Events" Project
                  let projId = '';
                  const { data: projs } = await supabase.from('projects').select('id, name').eq('name', 'Personal Events').eq('orchestra_id', orchId).maybeSingle();
                  if (projs) {
                      projId = projs.id;
                  } else {
                      const { data: newProj } = await supabase.from('projects').insert({ name: 'Personal Events', orchestra_id: orchId, color: '#64748b' }).select().single();
                      if (newProj) {
                        projId = newProj.id;
                        useAppStore.getState().setProjects([...useAppStore.getState().projects, { id: newProj.id, name: 'Personal Events', orchestraId: orchId, color: '#64748b', isActive: true }]);
                      }
                  }

                  // 3. Update the Event
                  const updated = {
                    ...editingEvent.resource,
                    projectId: projId,
                    type: 'personal',
                    title: editingEvent.title
                  };
                  useAppStore.getState().updateEvent(updated);
                  setEditingEvent(null);
                  await supabase.from("events").update({
                    project_id: projId,
                    type: 'personal',
                    title: editingEvent.title
                  }).eq("id", updated.id);
                }}
                className="text-slate-300 text-sm font-medium hover:text-slate-200 transition-colors bg-slate-500/20 px-3 py-1.5 rounded"
              >
                Mark Personal
              </button>`;

if (code.includes(targetBtn)) {
    code = code.replace(targetBtn, replacementBtn);
    fs.writeFileSync('src/components/CalendarView.tsx', code);
    console.log("Successfully added Mark as Personal button to CalendarView.tsx");
} else {
    console.log("Could not find exact text block to replace for Mark as Personal button");
}
