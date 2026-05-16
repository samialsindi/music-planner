import { NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/google';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' },
      { status: 501 },
    );
  }
  return NextResponse.redirect(buildAuthUrl(req));
}
