// src/app/dashboard/activities/[activityId]/edit/page.tsx
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import * as activityService from '@/services/activityService';
import EditActivityClient from './EditActivityClient';

export const dynamic = 'force-dynamic';

interface EditActivityPageProps {
  params: { activityId: string };
}

export default async function EditActivityPage(props: any) {
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
    let canEdit = false;
    if (profile.role === ROLES.NATIONAL_COORDINATOR) {
      canEdit = true;
    } else if (profile.role === ROLES.SITE_COORDINATOR) {
      canEdit = activity.siteId === profile.siteId;
    } else if (profile.role === ROLES.SMALL_GROUP_LEADER) {
      canEdit = activity.smallGroupId === profile.smallGroupId;
    }

    if (!canEdit) {
      return redirect('/dashboard?error=permission-denied');
    }

    return <EditActivityClient activity={activity} />;

  } catch (error) {
    // This will catch errors from getActivityById if the activity is not found
    return redirect('/dashboard?error=not-found');
  }
}

