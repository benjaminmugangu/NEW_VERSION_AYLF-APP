// src/app/dashboard/activities/[activityId]/page.tsx
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import * as activityService from '@/services/activityService';
import ActivityDetailClient from './ActivityDetailClient';

export const dynamic = 'force-dynamic';

export default async function ActivityDetailPage(props: any) {
  const params = await props.params;
  const { activityId } = params;
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) {
    return redirect('/api/auth/login');
  }

  const profileService = await import('@/services/profileService');
  const profile = await profileService.getProfile(user.id);

  if (!profile) {
    return redirect('/dashboard?error=unauthorized');
  }

  try {
    const activity = await activityService.getActivityById(activityId);

    // Server-side authorization check
    let canView = false;
    if (profile.role === ROLES.NATIONAL_COORDINATOR) {
      canView = true;
    } else if (profile.role === ROLES.SITE_COORDINATOR) {
      canView = activity.siteId === profile.siteId;
    } else if (profile.role === ROLES.SMALL_GROUP_LEADER) {
      canView = activity.smallGroupId === profile.smallGroupId;
    }

    if (!canView) {
      return redirect('/dashboard?error=permission-denied');
    }

    return <ActivityDetailClient activity={activity} userRole={profile.role as any} />;

  } catch (error) {
    return redirect('/dashboard?error=not-found');
  }
}

