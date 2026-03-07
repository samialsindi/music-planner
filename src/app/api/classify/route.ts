import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json({ error: 'Missing GROQ_API_KEY env variable.' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId in request body.' }, { status: 400 });
    }

    // 1. Fetch all events for this project
    const { data: events, error: fetchErr } = await supabase
      .from('events')
      .select('*')
      .eq('project_id', projectId)
      .order('start_time', { ascending: true });

    if (fetchErr) throw fetchErr;

    if (!events || events.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No events to classify" });
    }

    // 2. Prepare context for the LLM
    const eventsListText = events.map(e => `ID: ${e.id} | Title: ${e.title} | Current Type: ${e.type}`).join('\n');

    const prompt = `You are a musical events classification assistant. You will be given a list of events for a musical project/group.
Your task is to review their titles and current types and provide an updated classification for each.
If an event is clearly a rehearsal, set type to "rehearsal".
If it is clearly a concert, performance, or show, set type to "concert".
If it is a personal practice or clearly unrelated, set type to "personal".
Otherwise, set type to "other".
Additionally, try to infer instrumentation notes if possible (e.g., 'Tutti', 'Chorus Only', etc.) based on the title.

Respond ONLY with a JSON object containing a "classifications" array, where each object matches this structure exactly:
{
  "classifications": [
    {
      "id": "event-id-from-input",
      "type": "rehearsal" | "concert" | "personal" | "other",
      "inferred_notes": "Brief inferred notes or empty string",
      "timpani_required": boolean,
      "percussion_required": boolean
    }
  ]
}

Events to classify:
${eventsListText}
`;

    // 3. Call Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        console.error("Groq API error:", errorText);
        throw new Error('Failed to classify events with Groq');
    }

    const groqData = await groqResponse.json();
    let rawContent = groqData.choices[0].message.content;

    let parsedContent;
    try {
        parsedContent = JSON.parse(rawContent);
        if (parsedContent.classifications && Array.isArray(parsedContent.classifications)) {
            parsedContent = parsedContent.classifications;
        } else {
            throw new Error("Response does not contain a classifications array");
        }
    } catch (e) {
         console.error("Failed to parse LLM response:", rawContent);
         throw new Error("Invalid JSON format from LLM");
    }

    // 4. Update the events in Supabase
    let updatedCount = 0;
    for (const updateData of parsedContent) {
        if (!updateData.id) continue;

        const { error: updateErr } = await supabase
            .from('events')
            .update({
                type: ['rehearsal', 'concert', 'personal', 'other'].includes(updateData.type) ? updateData.type : 'other',
                inferred_notes: updateData.inferred_notes || '',
                timpani_required: updateData.timpani_required || false,
                percussion_required: updateData.percussion_required || false
            })
            .eq('id', updateData.id);

        if (!updateErr) updatedCount++;
    }

    return NextResponse.json({ success: true, count: updatedCount, data: parsedContent });

  } catch (error: any) {
    console.error("Classification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
