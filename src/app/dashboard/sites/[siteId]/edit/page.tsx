import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import siteService from '@/services/siteService';
import EditSiteClient from './EditSiteClient';

interface EditSitePageProps {
  params: { siteId: string };
}

export default async function EditSitePage(props: any) {
  const params = await props.params;
  const supabase = await createClient();
  const { siteId } = params;

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Authorization check: Only National Coordinators can edit sites.
  if (!profile || profile.role !== ROLES.NATIONAL_COORDINATOR) {
    return redirect('/dashboard?error=unauthorized');
  }

  try {
    const site = await siteService.getSiteById(siteId);
    return <EditSiteClient site={site} />;
  } catch (error) {
    // If the site is not found, the service throws an error.
    return redirect('/dashboard/sites?error=not-found');
  }
}

