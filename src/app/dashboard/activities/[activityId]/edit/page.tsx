// src/app/dashboard/activities/[activityId]/edit/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import { activityService } from '@/services/activityService';
import EditActivityClient from './EditActivityClient';

interface EditActivityPageProps {
  params: { activityId: string };
}

export default async function EditActivityPage(props: EditActivityPageProps) {
  const { params } = props;
  const supabase = createClient();
  const { activityId } = params;

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
    let canEdit = false;
    if (profile.role === ROLES.NATIONAL_COORDINATOR) {
      canEdit = true;
    } else if (profile.role === ROLES.SITE_COORDINATOR) {
      canEdit = activity.siteId === profile.site_id;
    } else if (profile.role === ROLES.SMALL_GROUP_LEADER) {
      canEdit = activity.smallGroupId === profile.small_group_id;
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

