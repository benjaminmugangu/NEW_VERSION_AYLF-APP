import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import NewSiteClient from './NewSiteClient';

export const dynamic = 'force-dynamic';

export default async function NewSitePage() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) {
    return redirect('/api/auth/login');
  }

  const profileService = await import('@/services/profileService');
  const profile = await profileService.getProfile(user.id);

  // Authorization check: Only National Coordinators can create new sites.
  if (!profile || profile.role !== ROLES.NATIONAL_COORDINATOR) {
    return redirect('/dashboard?error=unauthorized');
  }

  return <NewSiteClient />;
}

