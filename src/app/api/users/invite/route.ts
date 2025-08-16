// src/app/api/users/invite/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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

const inviteSchema = z.object({
  email: z.string().email('Invalid email address.'),
  name: z.string().min(3, 'Full name must be at least 3 characters long.'),
  role: z.enum(['national_coordinator', 'site_coordinator', 'small_group_leader', 'member']),
  siteId: z.string().uuid().optional().nullable(),
  smallGroupId: z.string().uuid().optional().nullable(),
});

export const POST = async (request: Request) => {
  const supabase = await createClient();
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
    return NextResponse.json({ error: 'Forbidden: You do not have permission to invite users.' }, { status: 403 });
  }

  const body = await request.json();
  const validation = inviteSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
  }

  let { email, name: fullName, role, siteId, smallGroupId } = validation.data;

  if (role === 'national_coordinator') {
    siteId = null;
    smallGroupId = null;
  } else if (role === 'site_coordinator') {
    smallGroupId = null;
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const password = generateRandomPassword();

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, 
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

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      role: role,
      site_id: siteId,
      small_group_id: smallGroupId,
      name: fullName,
    })
    .eq('id', authData.user.id);

  if (profileError) {
    console.error('Error updating profile:', profileError);
    return NextResponse.json({ error: `User created, but failed to set profile: ${profileError.message}` }, { status: 500 });
  }

  return NextResponse.json({ 
    message: 'User created successfully. Please share the generated password with them.', 
    user: authData.user,
    password: password,
  });
};
