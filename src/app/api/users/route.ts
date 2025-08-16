// src/app/api/users/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/middleware';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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
  siteId: z.string().optional().nullable(),
  smallGroupId: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  mandateStartDate: z.string().optional().nullable(),
  mandateEndDate: z.string().optional().nullable(),
}).refine(data => {
  if (data.mandateStartDate && data.mandateEndDate) {
    return new Date(data.mandateEndDate) >= new Date(data.mandateStartDate);
  }
  return true;
}, {
  message: 'End date cannot be before start date',
  path: ['mandateEndDate'],
});

export async function POST(request: Request) {
  const supabase = createClient(request as any);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profile?.role !== 'national_coordinator') {
    return NextResponse.json({ error: 'Forbidden: You do not have permission to create users.' }, { status: 403 });
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await request.json();
    const validation = userCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }

    const { name, email, role, siteId, smallGroupId, status, mandateStartDate, mandateEndDate } = validation.data;
    const password = generatePassword();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        status,
        site_id: siteId,
        small_group_id: smallGroupId,
        mandate_start_date: mandateStartDate,
        mandate_end_date: mandateEndDate,
      },
    });

    if (authError) {
      if (authError.message.includes('unique constraint')) {
        return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    if (!authData.user) {
        return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'User created successfully',
      credentials: {
        email,
        password,
      }
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
