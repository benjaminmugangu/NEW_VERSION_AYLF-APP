import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Password updated successfully.' });

  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
}
