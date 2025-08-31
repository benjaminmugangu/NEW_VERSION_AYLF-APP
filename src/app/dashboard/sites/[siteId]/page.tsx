import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import siteService from '@/services/siteService';
import { smallGroupService } from '@/services/smallGroupService';
import SiteDetailClient from './SiteDetailClient';

interface SiteDetailPageProps {
  params: { siteId: string };
}

export default async function SiteDetailPage({ params }: SiteDetailPageProps) {
  const supabase = createClient();
  const { siteId } = params;

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, site_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return redirect('/dashboard?error=unauthorized');
  }

  try {
    const site = await siteService.getSiteById(siteId);

    // Authorization check
    const isNationalCoordinator = profile.role === ROLES.NATIONAL_COORDINATOR;
    const isCorrectSiteCoordinator = profile.role === ROLES.SITE_COORDINATOR && profile.site_id === site.id;

    if (!isNationalCoordinator && !isCorrectSiteCoordinator) {
      return redirect('/dashboard/sites?error=permission-denied');
    }

    // Fetch related data
        // The return type of getSmallGroupsBySite includes members_count
    const smallGroups = await smallGroupService.getSmallGroupsBySite(siteId);
    const totalMembers = smallGroups.reduce((acc: number, sg) => acc + (sg.memberCount || 0), 0);

    // Determine if the user has management rights (only NC can edit/delete sites)
    const canManageSite = isNationalCoordinator;

    return (
      <SiteDetailClient 
        site={site} 
        initialSmallGroups={smallGroups}
        totalMembers={totalMembers}
        canManageSite={canManageSite}
      />
    );
  } catch (error) {
    return redirect('/dashboard/sites?error=not-found');
  }
}

