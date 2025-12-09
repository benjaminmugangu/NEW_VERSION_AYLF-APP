// src/app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { MESSAGES } from '@/lib/messages';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await context.params;

  // Authenticate via Kinde
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
  }

  // Get user profile from Supabase to check role
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'national_coordinator') {
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
    return NextResponse.json({ error: MESSAGES.errors.serverError }, { status: 500 });
  }
}
