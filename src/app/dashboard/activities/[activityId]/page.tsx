// src/app/dashboard/activities/[activityId]/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import { activityService } from '@/services/activityService';
import ActivityDetailClient from './ActivityDetailClient';

export default async function ActivityDetailPage(props: any) {
  const supabase = createClient();
  const { activityId } = props.params;

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, site_id, small_group_id')
    .eq('id', user.id)
    .single();

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
      canView = activity.siteId === profile.site_id;
    } else if (profile.role === ROLES.SMALL_GROUP_LEADER) {
      canView = activity.smallGroupId === profile.small_group_id;
    }

    if (!canView) {
      return redirect('/dashboard?error=permission-denied');
    }

    return <ActivityDetailClient activity={activity} userRole={profile.role} />;

  } catch (error) {
    return redirect('/dashboard?error=not-found');
  }
}

