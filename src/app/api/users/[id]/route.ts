// src/app/api/users/[id]/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = params.id;
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore }, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  });

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    // 1. Soft delete the user's profile by setting deleted_at and status
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'inactive',
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Supabase profile soft delete error:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 2. Disable the user in auth.users by setting a ban duration
    // This prevents login but preserves the user record for data integrity.
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: 'inf', // Indefinite ban
    });

    if (authError) {
        // If the user is already banned or not found, we might not want to fail the whole operation.
        // For now, we'll log it and return an error.
        console.error('Supabase auth disable error:', authError);
        return NextResponse.json({ error: `Failed to disable user in authentication system: ${authError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: 'User archived successfully' }, { status: 200 });

  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
