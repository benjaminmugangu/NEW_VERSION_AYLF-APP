// src/app/api/users/invite/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// This creates a Supabase client that has the permissions of the logged-in user.
// For admin tasks, we'll need a service role client.
import { createClient } from '@supabase/supabase-js';

// Function to generate a random password
const generateRandomPassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
};

export const POST = async (request: Request) => {
  let { email, name: fullName, role, siteId, smallGroupId } = await request.json();

  if (!email || !fullName || !role) {
    return NextResponse.json({ error: 'Email, full name, and role are required.' }, { status: 400 });
  }

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

  const password = generateRandomPassword();

  // 1. Create the user in the auth schema
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, // Auto-confirm the email
    user_metadata: {
      full_name: fullName,
      role: role, // Store role in metadata as a fallback
    },
  });

  if (authError) {
    console.error('Error creating auth user:', authError);
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  if (!authData.user) {
    return NextResponse.json({ error: 'Could not create user.' }, { status: 500 });
  }

  // 2. The trigger on `auth.users` should have created a profile. Now, update it.
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      role: role,
      site_id: siteId,
      small_group_id: smallGroupId,
      name: fullName, // Ensure name is also set here
    })
    .eq('id', authData.user.id);

  if (profileError) {
    console.error('Error updating profile:', profileError);
    // This is problematic, the auth user exists but the profile is incomplete.
    // For now, we'll return an error but a more robust solution might be needed.
    return NextResponse.json({ error: `User created, but failed to set profile: ${profileError.message}` }, { status: 500 });
  }

  // Return the generated password so the admin can share it manually
  return NextResponse.json({ 
    message: 'User created successfully. Please share the generated password with them.', 
    user: authData.user,
    password: password, // IMPORTANT: This is sent back to the admin frontend
  });
};
