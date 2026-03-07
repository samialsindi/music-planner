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

    // Adapt to typical webhook payloads (e.g. from Make.com or Cloudmailin)
    const emailText = body.text || body.content || body.plain || body.message || (typeof body === 'string' ? body : JSON.stringify(body));

    if (!emailText || emailText.trim() === '') {
      return NextResponse.json({ error: 'No text content found in webhook payload.' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Call Groq to parse the email
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // fast groq model
        messages: [
          {
            role: 'system',
            content: `You are an assistant that extracts concert and rehearsal information from emails or free-form text.
Extract the event details and return ONLY a valid JSON object matching this structure:
{
  "orchestra_name": "Name of the orchestra or group (e.g. 'NY Phil', 'Unknown Orchestra' if not specified)",
  "project_name": "Name of the project or concert series (e.g. 'Beethoven 9th', 'Unknown Project' if not specified)",
  "title": "Specific Event Name (e.g. 'Rehearsal 1' or 'Concert')",
  "type": "concert" | "rehearsal" | "other",
  "start_time": "YYYY-MM-DDTHH:mm:ssZ",
  "end_time": "YYYY-MM-DDTHH:mm:ssZ",
  "is_all_day": true/false,
  "inferred_notes": "Any extra notes about instrumentation (e.g. timpani required, chorus only, etc.)",
  "timpani_required": true/false,
  "percussion_required": true/false
}
If a specific date or time is missing, assume it is an all day event occurring today (${todayStr}) (is_all_day = true, start_time and end_time set to today's date).
If a specific end time is not provided but a start time is, assume 2 hours after start time.
If year is missing, assume current year.`
          },
          {
            role: 'user',
            content: emailText
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        console.error("Groq API error:", errorText);
        throw new Error('Failed to parse email with Groq');
    }

    const groqData = await groqResponse.json();
    const parsedContent = JSON.parse(groqData.choices[0].message.content);

    // 1. Get or Create Orchestra
    const orchName = parsedContent.orchestra_name || 'Unknown Orchestra';
    let { data: orchestra } = await supabase.from('orchestras').select('id').ilike('name', orchName).maybeSingle();

    if (!orchestra) {
      const { data: newOrchestra, error: orchErr } = await supabase.from('orchestras')
        .insert({ name: orchName, color: '#2563eb' }) // Blue
        .select()
        .single();

      if (orchErr && orchErr.code !== '23505') throw orchErr; // ignore unique constraint violation if inserted concurrently

      // if unique constraint error, fetch it again
      if (!newOrchestra) {
         let retry = await supabase.from('orchestras').select('id').ilike('name', orchName).maybeSingle();
         orchestra = retry.data;
      } else {
        orchestra = newOrchestra;
      }
    }

    // 2. Get or Create Project
    const projName = parsedContent.project_name || 'Email Ingested';
    let { data: project } = await supabase.from('projects')
        .select('id')
        .eq('name', projName)
        .eq('orchestra_id', orchestra!.id)
        .maybeSingle();

    if (!project) {
      const { data: newProject, error: projErr } = await supabase.from('projects')
        .insert({ name: projName, orchestra_id: orchestra!.id, color: '#10b981' }) // Emerald color
        .select()
        .single();

      if (projErr) throw projErr;
      project = newProject;
    }

    const newEventId = `email-${Date.now()}`;

    const isAllDay = parsedContent.is_all_day === true;
    let startTime = parsedContent.start_time;
    let endTime = parsedContent.end_time;

    if (!startTime) {
        startTime = new Date().toISOString();
    }
    if (!endTime) {
        endTime = new Date(new Date(startTime).getTime() + 2 * 60 * 60 * 1000).toISOString();
    }


    // 3. Save Event to Supabase with status = 'pending'
    const { error: insertErr } = await supabase.from('events').insert({
      id: newEventId,
      project_id: project!.id,
      title: parsedContent.title || 'New Email Event',
      type: ['rehearsal', 'concert', 'other'].includes(parsedContent.type) ? parsedContent.type : 'other',
      start_time: startTime,
      end_time: endTime,
      is_all_day: isAllDay,
      status: 'pending', // Pending by default from email
      source: 'email',
      is_toggled: true,
      inferred_notes: parsedContent.inferred_notes || '',
      timpani_required: parsedContent.timpani_required || false,
      percussion_required: parsedContent.percussion_required || false
    });

    if (insertErr) {
        console.error("Supabase insert error:", insertErr);
        throw insertErr;
    }

    return NextResponse.json({ success: true, eventId: newEventId, parsedData: parsedContent });

  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
