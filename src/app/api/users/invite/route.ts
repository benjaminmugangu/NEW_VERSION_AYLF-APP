// src/app/api/users/invite/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// This creates a Supabase client that has the permissions of the logged-in user.
// For admin tasks, we'll need a service role client.
import { createClient } from '@supabase/supabase-js';

// Function to generate a random password


export const POST = async (request: Request) => {
  const { email, name: fullName, role } = await request.json();

  if (!email || !fullName || !role) {
    return NextResponse.json({ error: 'Email, full name, and role are required.' }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Use the built-in inviteUserByEmail method
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName,
      role: role,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ 
    message: 'Invitation sent successfully.', 
    user: data.user 
  });
};
