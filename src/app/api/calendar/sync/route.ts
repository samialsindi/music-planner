import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // STUB: Google Calendar API Sync
  // In a future update, this endpoint will accept user OAuth tokens
  // and push approved Supabase events directly to the user's Google Calendar via the Google Calendar API.

  // See GCAL_OAUTH_SETUP.md for instructions on how to enable this functionality.
  return NextResponse.json({
    message: "Google Calendar API Sync is currently a stub.",
    instructions: "Please refer to GCAL_OAUTH_SETUP.md to configure Google Cloud credentials."
  }, { status: 501 }); // 501 Not Implemented
}
