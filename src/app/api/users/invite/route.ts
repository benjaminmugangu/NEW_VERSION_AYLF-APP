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
  const { email, name: fullName, role } = await request.json();

  if (!email || !fullName || !role) {
    return NextResponse.json({ error: 'Email, full name, and role are required.' }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const password = generateRandomPassword();

  // Create user directly instead of sending an invitation
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, // Auto-confirm the email, as we are not sending a confirmation link
    user_metadata: {
      full_name: fullName,
      role: role,
    },
  });

  if (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Return the generated password so the admin can share it manually
  return NextResponse.json({ 
    message: 'User created successfully. Please share the generated password with them.', 
    user: data.user,
    password: password, // IMPORTANT: This is sent back to the admin frontend
  });
};
