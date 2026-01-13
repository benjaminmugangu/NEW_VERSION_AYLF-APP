import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import * as siteService from '@/services/siteService';
import * as smallGroupService from '@/services/smallGroupService';
import SiteDetailClient from './SiteDetailClient';

interface SiteDetailPageProps {
  params: { siteId: string };
}

export const dynamic = 'force-dynamic';

export default async function SiteDetailPage(props: any) {
  const params = await props.params;
  const { siteId } = params;
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) {
    return redirect('/api/auth/login');
  }

  const profileService = await import('@/services/profileService');
  const profileResponse = await profileService.getProfile(user.id);

  if (!profileResponse.success || !profileResponse.data) {
    return redirect('/dashboard?error=unauthorized');
  }

  const profile = profileResponse.data;

  try {
    const siteResponse = await siteService.getSiteById(siteId);
    if (!siteResponse.success || !siteResponse.data) {
      return redirect('/dashboard/sites?error=not-found');
    }
    const site = siteResponse.data;

    // Authorization check
    const isNationalCoordinator = profile.role === ROLES.NATIONAL_COORDINATOR;
    const isCorrectSiteCoordinator = profile.role === ROLES.SITE_COORDINATOR && profile.siteId === site.id;

    if (!isNationalCoordinator && !isCorrectSiteCoordinator) {
      return redirect('/dashboard/sites?error=permission-denied');
    }

    // Fetch related data
    const sgResponse = await smallGroupService.getSmallGroupsBySite(siteId);
    const smallGroups = sgResponse.success && sgResponse.data ? sgResponse.data : [];
    const totalMembers = smallGroups.reduce((acc: number, sg) => acc + (sg.memberCount || 0), 0);

    // Fetch coordinator history
    const historyService = await import('@/services/coordinatorHistoryService');
    const historyResponse = await historyService.getCoordinatorHistory({
      entityType: 'site',
      siteId: site.id,
      includeActive: true,
      includePast: true
    });
    const historyData = historyResponse.success && historyResponse.data ? historyResponse.data : [];

    // Determine if the user has management rights (only NC can edit/delete sites)
    const canManageSite = isNationalCoordinator;

    return (
      <SiteDetailClient
        site={site}
        initialSmallGroups={smallGroups}
        totalMembers={totalMembers}
        canManageSite={canManageSite}
        historyData={historyData}
      />
    );
  } catch (error) {
    return redirect('/dashboard/sites?error=not-found');
  }
}

