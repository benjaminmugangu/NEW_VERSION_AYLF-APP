// src/app/dashboard/activities/new/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import NewActivityClient from './NewActivityClient';

export default async function NewActivityPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const allowedRoles = [
    ROLES.NATIONAL_COORDINATOR,
    ROLES.SITE_COORDINATOR,
    ROLES.SMALL_GROUP_LEADER,
  ];

  if (!profile || !allowedRoles.includes(profile.role)) {
    return redirect('/dashboard');
  }

  return <NewActivityClient />;
}
