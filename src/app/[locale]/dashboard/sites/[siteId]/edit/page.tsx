import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import * as siteService from '@/services/siteService';
import EditSiteClient from './EditSiteClient';

interface EditSitePageProps {
  params: { siteId: string };
}

export const dynamic = 'force-dynamic';

export default async function EditSitePage(props: any) {
  const params = await props.params;
  const { siteId } = params;
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) {
    return redirect('/api/auth/login');
  }

  const profileService = await import('@/services/profileService');
  const profile = await profileService.getProfile(user.id);

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

