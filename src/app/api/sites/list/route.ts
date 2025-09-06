import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { ROLES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch role from profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, site_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY on server. Set it in Vercel env (Preview & Production).' }, { status: 500 });
  }

  try {
    // created_at existe en base; on le renvoie sous l'alias creation_date pour compat frontend
    let query = admin.from('sites').select('id,name,city,country,creation_date:created_at,coordinator_id');

    const role = String(profile.role || '').toLowerCase();
    if (role === ROLES.SITE_COORDINATOR || role === ROLES.SMALL_GROUP_LEADER) {
      if (profile.site_id) {
        query = query.eq('id', profile.site_id);
      } else {
        return NextResponse.json([], { status: 200 });
      }
    }

    const { data, error: listError } = await query.order('name', { ascending: true });
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500 });
  }
}
