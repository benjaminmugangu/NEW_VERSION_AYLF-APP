// src/app/dashboard/users/page.tsx
import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/shared/PageHeader';
import { UsersList } from './components/UsersList';
import { Button } from '@/components/ui/button';
import { UsersRound, UserPlus } from 'lucide-react';
import { ROLES } from '@/lib/constants';
import type { User } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';

async function getUsers(): Promise<User[]> {
  // Note: We create a temporary admin client here to fetch all users.
  // This should be handled with care and proper security policies.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin.rpc('get_users_with_details');

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return data as User[];
}

export default async function ManageUsersPage() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const { data: { session } } = await supabase.auth.getSession();
  const userRole = session?.user?.user_metadata?.role;

  if (userRole !== ROLES.NATIONAL_COORDINATOR) {
    redirect('/dashboard'); 
  }

  const users = await getUsers();

  return (
    <>
      <PageHeader 
        title="User Management"
        description="Administer user accounts, roles, and permissions."
        icon={UsersRound}
        actions={
          <Link href="/dashboard/users/new">
            <Button><UserPlus className="mr-2 h-4 w-4" /> Add New User</Button>
          </Link>
        }
      />
      <UsersList initialUsers={users} />
    </>
  );
}
