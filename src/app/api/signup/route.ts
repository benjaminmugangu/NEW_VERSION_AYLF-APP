import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(request: Request) {
  const { fullName, email, password } = await request.json();

  // 1. Check for environment variables for admin client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables for admin.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  // 2. Create Supabase admin client to check for existing users
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 3. Check if any user exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json({ error: 'Could not verify user status.' }, { status: 500 });
    }

    // 4. If users exist, deny registration
    if (users.length > 0) {
      return NextResponse.json({ error: 'Public registration is disabled. Please contact an administrator for an invitation.' }, { status: 403 });
    }

    // 5. If no users exist, proceed with signup for the first user
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          // The first user will have a null role initially
          // and will have to set it manually in Supabase DB
        },
      },
    });

    if (signUpError) {
        console.error('Sign up error:', signUpError);
        return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    // Handle case where user might exist but is unconfirmed
    if (!data.user && !signUpError) {
        return NextResponse.json({ message: 'Confirmation email sent. Please check your inbox.' }, { status: 200 });
    }

    return NextResponse.json({ message: 'Registration successful! Please check your email to confirm your account.', user: data.user }, { status: 200 });

  } catch (err) {
    console.error("Erreur détaillée dans l'API d'inscription:", err);
    console.error('Unexpected error during signup:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
