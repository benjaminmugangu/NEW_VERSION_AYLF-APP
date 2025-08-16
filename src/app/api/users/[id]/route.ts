// src/app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/middleware';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const paramsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid User ID format.' }),
});

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  const supabase = createClient(request as any);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profile?.role !== 'national_coordinator') {
    return NextResponse.json({ error: 'Forbidden: You do not have permission to archive users.' }, { status: 403 });
  }

  const validation = paramsSchema.safeParse(context.params);

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
  }

  const { id: userId } = validation.data;

  if (userId === session.user.id) {
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

    return NextResponse.json({ message: 'User archived successfully' }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
