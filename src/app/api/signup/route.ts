import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

const signupSchema = z.object({
  fullName: z.string().min(3, { message: 'Full name must be at least 3 characters long.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long.' }),
});

export async function POST(request: Request) {
  const body = await request.json();
  const validation = signupSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const { fullName, email, password } = validation.data;

  // 1. Check for environment variables for admin client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables for admin.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  // 2. Create Supabase admin client to check for existing users
    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);

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
        const supabase = createClient();

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
