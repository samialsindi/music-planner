import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  try {
    // Clear all data in reverse dependency order
    await supabase.from('events').delete().neq('id', '');
    await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('orchestras').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    return NextResponse.json({ success: true, message: 'All data cleared.' });
  } catch (error: any) {
    console.error("Reset Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
