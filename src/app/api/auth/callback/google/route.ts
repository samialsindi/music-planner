import { NextResponse } from 'next/server';
import { makeOAuthClient, saveTokens } from '@/lib/google';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const base = url.origin;

  if (error) {
    return NextResponse.redirect(`${base}/settings?gcal_error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${base}/settings?gcal_error=missing_code`);
  }

  try {
    const oauth = makeOAuthClient(req);
    const { tokens } = await oauth.getToken(code);
    await saveTokens({
      access_token: tokens.access_token ?? null,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      scope: tokens.scope ?? null,
    });
    return NextResponse.redirect(`${base}/settings?gcal=connected`);
  } catch (err: any) {
    return NextResponse.redirect(`${base}/settings?gcal_error=${encodeURIComponent(err.message || 'token_exchange_failed')}`);
  }
}
