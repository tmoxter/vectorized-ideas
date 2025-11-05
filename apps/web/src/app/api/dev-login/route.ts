import "server-only";
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function isLocal(u: string) {
  try {
    const url = new URL(u);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch { return false; }
}

export async function GET() {
  if (process.env.NEXT_PUBLIC_AUTH_MODE !== 'dev-magiclink') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  // Reference DEV credentials explicitly here against extarnal attempts to use this route on prod
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV!;
    if (!isLocal(url)) {
        return NextResponse.json({ error: 'Not available' }, { status: 404 });
    }
  const key = process.env.SUPABASE_SERVICE_ROLE_DEV!;
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/`;

  const admin = createClient(url, key, { auth: { persistSession: false } });

  const email = 'dev@local.test';
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo }
  });

  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ error: error?.message ?? 'no action_link' }, { status: 500 });
  }

  return NextResponse.redirect(data.properties.action_link, { status: 302 });
}