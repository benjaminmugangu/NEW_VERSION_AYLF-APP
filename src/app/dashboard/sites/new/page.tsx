import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import NewSiteClient from './NewSiteClient';

export default async function NewSitePage() {
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

  // Authorization check: Only National Coordinators can create new sites.
  if (!profile || profile.role !== ROLES.NATIONAL_COORDINATOR) {
    return redirect('/dashboard?error=unauthorized');
  }

  return <NewSiteClient />;
}

