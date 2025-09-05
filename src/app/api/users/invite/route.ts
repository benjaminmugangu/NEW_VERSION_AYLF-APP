import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const POST = async (request: Request) => {
  const cookieStore = cookies();
  const supabase = await createSupabaseServerClient();

  // 1. Check if the user making the request is authenticated and is an admin
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'national_coordinator') {
    return NextResponse.json({ error: 'Forbidden: You do not have permission to create users.' }, { status: 403 });
  }

  // 2. Validate input with Zod
  const inviteSchema = z.object({
    email: z.string().email(),
    name: z.string().min(2),
    role: z.enum(['national_coordinator', 'site_coordinator', 'small_group_leader']),
    siteId: z.string().nullable().optional(),
    smallGroupId: z.string().nullable().optional(),
    mandateStartDate: z.any().optional(),
    mandateEndDate: z.any().optional(),
    status: z.enum(['active','inactive']).optional(),
  });

  const parseResult = inviteSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.format() }, { status: 400 });
  }

  let { email, name: fullName, role, siteId, smallGroupId } = parseResult.data;

  // Enforce business logic for assignments based on role
  if (role === 'national_coordinator') {
    siteId = null;
    smallGroupId = null;
  } else if (role === 'site_coordinator') {
    smallGroupId = null;
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Determine site URL for redirect (prefer env, then request origin, then fallback)
  const headersList = await headers();
  const originHeader = headersList.get('origin') || '';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || originHeader || 'https://new-version-aylf-app-yzwe-git-8f7981-benjamin-mugangus-projects.vercel.app';

  // Use Supabase's invite user functionality which sends an email automatically
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback`,
    data: {
      full_name: fullName,
      role: role,
      site_id: siteId,
      small_group_id: smallGroupId,
    },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  if (!authData.user) {
    return NextResponse.json({ error: 'Could not create user.' }, { status: 500 });
  }

  return NextResponse.json({
    message: 'User invitation sent successfully. The user will receive an email with instructions to set up their account.',
    user: authData.user,
  });
};
