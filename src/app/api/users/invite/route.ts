import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Function to generate a random password
const generateRandomPassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

export const POST = async (request: Request) => {
  const cookieStore = cookies();
  const supabase = await createSupabaseServerClient();

  // 1. Check if the user making the request is authenticated and is an admin
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'national_coordinator') {
    return NextResponse.json({ error: 'Forbidden: You do not have permission to create users.' }, { status: 403 });
  }

  // 2. Proceed with creating the new user
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

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, // Auto-confirm the email
    user_metadata: {
      full_name: fullName,
      role: role,
    },
  });

  if (authError) {
    console.error('Error creating auth user:', authError);
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  if (!authData.user) {
    return NextResponse.json({ error: 'Could not create user.' }, { status: 500 });
  }

  // 3. Update the profile for the newly created user
  const { error: updateProfileError } = await supabaseAdmin
    .from('profiles')
    .update({
      role: role,
      site_id: siteId,
      small_group_id: smallGroupId,
      name: fullName,
    })
    .eq('id', authData.user.id);

  if (updateProfileError) {
    console.error('Error updating profile:', updateProfileError);
    return NextResponse.json({ error: `User created, but failed to set profile: ${updateProfileError.message}` }, { status: 500 });
  }

  return NextResponse.json({
    message: 'User created successfully. Please share the generated password with them.',
    user: authData.user,
    password: password,
  });
};
