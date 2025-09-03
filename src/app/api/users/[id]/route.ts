// src/app/api/users/[id]/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ROLES } from '@/lib/constants';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userIdToDelete } = await params;
  const supabase = await createSupabaseServerClient();

  // 1. Check for authenticated user and role
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.user_metadata.role !== ROLES.NATIONAL_COORDINATOR) {
    return NextResponse.json({ error: 'Forbidden: You do not have permission to perform this action.' }, { status: 403 });
  }

  if (!userIdToDelete) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }
  
  if (user.id === userIdToDelete) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
  }

  // Use the admin client for privileged operations
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 2. Soft delete the user's profile by setting status to 'inactive'
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'inactive' })
      .eq('id', userIdToDelete);

    if (profileError) {
      console.error('Supabase profile soft delete error:', profileError);
      return NextResponse.json({ error: `Failed to update profile: ${profileError.message}` }, { status: 500 });
    }

    // 3. Disable the user in auth.users by setting a ban duration
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userIdToDelete, {
      ban_duration: 'inf', // Indefinite ban
    });

    if (authError) {
      console.error('Supabase auth disable error:', authError);
      return NextResponse.json({ error: `Failed to disable user: ${authError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: 'User archived successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Internal server error during user deletion:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
