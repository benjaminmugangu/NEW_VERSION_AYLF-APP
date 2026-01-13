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
  const profileResponse = await profileService.getProfile(user.id);

  // Authorization check: Only National Coordinators can edit sites.
  if (!profileResponse.success || !profileResponse.data || profileResponse.data.role !== ROLES.NATIONAL_COORDINATOR) {
    return redirect('/dashboard?error=unauthorized');
  }

  try {
    const siteResponse = await siteService.getSiteById(siteId);
    if (!siteResponse.success || !siteResponse.data) {
      return redirect('/dashboard/sites?error=not-found');
    }
    return <EditSiteClient site={siteResponse.data} />;
  } catch (error) {
    return redirect('/dashboard/sites?error=not-found');
  }
}

