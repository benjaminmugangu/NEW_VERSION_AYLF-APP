// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { MESSAGES } from '@/lib/messages';
import { withApiRLS } from '@/lib/apiWrapper';

export const DELETE = withApiRLS(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const { id: userId } = await context.params;

  const { getUser } = getKindeServerSession();
  const user = await getUser();

  // Get user profile from Supabase to check role
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'NATIONAL_COORDINATOR') {
    return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
  }

  if (userId === user.id) {
    return NextResponse.json({ error: 'You cannot archive your own account.' }, { status: 403 });
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'inactive',
      })
      .eq('id', userId);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: 'inf',
    });

    if (authError) {
      return NextResponse.json({ error: `Failed to disable user in authentication system: ${authError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: MESSAGES.success.deleted }, { status: 200 });

  } catch (error) {
    console.error('Failed to delete Kinde user:', error);
    return NextResponse.json({ error: MESSAGES.errors.serverError }, { status: 500 });
  }
});
