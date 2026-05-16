import { NextResponse } from 'next/server';
import { loadTokens, isConnected } from '@/lib/google';

export const dynamic = 'force-dynamic';

export async function GET() {
  const tokens = await loadTokens();
  return NextResponse.json({
    connected: isConnected(tokens),
    hasConfirmedCalendar: !!tokens?.confirmed_calendar_id,
    configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  });
}
