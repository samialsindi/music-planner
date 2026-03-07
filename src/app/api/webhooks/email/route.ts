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

    // Call Groq to parse the email
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192', // or dynamically fetch model if needed, but this is a standard fast groq model
        messages: [
          {
            role: 'system',
            content: `You are an assistant that extracts concert and rehearsal information from emails.
Extract the event details and return ONLY a valid JSON object matching this structure:
{
  "title": "Event Name",
  "type": "concert" | "rehearsal" | "other",
  "start_time": "YYYY-MM-DDTHH:mm:ssZ",
  "end_time": "YYYY-MM-DDTHH:mm:ssZ",
  "inferred_notes": "Any extra notes about instrumentation (e.g. timpani required, chorus only, etc.)",
  "timpani_required": true/false,
  "percussion_required": true/false
}
If a specific end time is not provided, assume 2 hours after start time. If year is missing, assume current year.`
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

    // Get or Create "Email Ingested" project
    let { data: project } = await supabase.from('projects').select('id').eq('name', 'Email Ingested').maybeSingle();
    if (!project) {
      const { data: newProject, error: projErr } = await supabase.from('projects')
        .insert({ name: 'Email Ingested', color: '#10b981' }) // Emerald color
        .select()
        .single();

      if (projErr) throw projErr;
      project = newProject;
    }

    const newEventId = `email-${Date.now()}`;

    // Save to Supabase
    const { error: insertErr } = await supabase.from('events').insert({
      id: newEventId,
      project_id: project!.id,
      title: parsedContent.title || 'New Email Event',
      type: ['rehearsal', 'concert', 'other'].includes(parsedContent.type) ? parsedContent.type : 'other',
      start_time: parsedContent.start_time || new Date().toISOString(),
      end_time: parsedContent.end_time || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
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
