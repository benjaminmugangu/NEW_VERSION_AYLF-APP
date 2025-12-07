import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from 'next/navigation';
import Link from 'next/link';
// import { profileService } from '@/services/profileService'; // Removed unused static import
import { PageHeader } from '@/components/shared/PageHeader';
import { ROLES } from '@/lib/constants';
import { Building, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SiteWithDetails } from '@/lib/types';
import { SitesClient } from './components/SitesClient';
import * as siteService from '@/services/siteService';

const ALLOWED_ROLES = [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER];

export const dynamic = 'force-dynamic';

export default async function ManageSitesPage() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) {
    redirect('/api/auth/login');
  }

  const profileService = await import('@/services/profileService');
  const userProfile = await profileService.getProfile(user.id);

  if (!userProfile || !ALLOWED_ROLES.includes(userProfile.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h2 className="text-2xl font-semibold text-destructive mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
        <Button asChild className="mt-4">
          <a href="/dashboard">Go to Dashboard</a>
        </Button>
      </div>
    );
  }

  const allSites: SiteWithDetails[] = await siteService.getSitesWithDetails(userProfile);

  const analytics = {
    totalSites: allSites.length,
    totalSmallGroups: allSites.reduce((acc, site) => acc + (site.smallGroupsCount || 0), 0),
    totalMembers: allSites.reduce((acc, site) => acc + (site.membersCount || 0), 0),
  };

  const canCreateSite = userProfile.role === ROLES.NATIONAL_COORDINATOR;

  return (
    <>
      <PageHeader
        title="Manage Sites"
        description="Oversee all AYLF operational sites, their coordinators, and performance."
        icon={Building}
        actions={
          canCreateSite && (
            <Button asChild>
              <Link href="/dashboard/sites/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Site
              </Link>
            </Button>
          )
        }
      />
      <SitesClient
        initialSites={allSites}
        user={userProfile}
        analytics={analytics}
      />
    </>
  );
}

