// src/app/dashboard/activities/new/page.tsx
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import NewActivityClient from './NewActivityClient';

export const dynamic = 'force-dynamic';

export default async function NewActivityPage() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) {
    return redirect('/api/auth/login');
  }

  const profileService = await import('@/services/profileService');
  const profile = await profileService.getProfile(user.id);

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
