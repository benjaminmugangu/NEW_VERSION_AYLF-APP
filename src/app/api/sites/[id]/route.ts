// src/app/api/sites/[id]/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ROLES } from '@/lib/constants';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: siteId } = params;
  const supabase = await createSupabaseServerClient();

  // 1. Check for authenticated user and role
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.user_metadata.role !== ROLES.NATIONAL_COORDINATOR) {
    return NextResponse.json({ error: 'Forbidden: You do not have permission to perform this action.' }, { status: 403 });
  }

  if (!siteId) {
    return NextResponse.json({ error: 'Site ID is required' }, { status: 400 });
  }

  // Use the admin client for privileged operations
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 2. Delete the site from the database
    const { error } = await supabaseAdmin
      .from('sites')
      .delete()
      .eq('id', siteId);

    if (error) {
      console.error('Supabase site delete error:', error);
      // Provide a more user-friendly message for foreign key violations
      if (error.code === '23503') {
          return NextResponse.json({ error: 'Cannot delete site with active small groups or members. Please reassign them first.'}, { status: 409 });
      }
      return NextResponse.json({ error: `Failed to delete site: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: 'Site deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Internal server error during site deletion:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
