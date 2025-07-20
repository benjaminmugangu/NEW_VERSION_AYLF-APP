// src/app/api/users/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Helper to generate a random password
const generatePassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
};

const userCreateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['national_coordinator', 'site_coordinator', 'small_group_leader', 'member']),
  siteId: z.string().optional(),
  smallGroupId: z.string().optional(),
});

export async function POST(request: Request) {
  const cookieStore = cookies();
  // Use createRouteHandlerClient for server-side operations with admin privileges
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore }, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  });

  try {
    const body = await request.json();
    const validation = userCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }

    const { name, email, role, siteId, smallGroupId } = validation.data;
    const password = generatePassword();

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        name,
        role,
        site_id: siteId,
        small_group_id: smallGroupId,
      },
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      // Provide a more user-friendly error message
      if (authError.message.includes('unique constraint')) {
        return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    if (!authData.user) {
        return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
    }

    // The user's profile is automatically created by a trigger in Supabase
    // when a new auth.users entry is made. We just return the generated credentials.

    return NextResponse.json({ 
      message: 'User created successfully',
      credentials: {
        email,
        password,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
