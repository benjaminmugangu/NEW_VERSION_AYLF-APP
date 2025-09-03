// src/app/dashboard/activities/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
// Avoid using profileService here because it relies on a browser client; use server client directly.
import { activityService } from '@/services/activityService';
import { ActivitiesClient } from './components/ActivitiesClient';
import { ROLES } from '@/lib/constants';
import { PageHeader } from '@/components/shared/PageHeader';
import { Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ALLOWED_ROLES = [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER];

export default async function ActivitiesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, email, role, status, site_id, small_group_id, mandate_start_date, mandate_end_date, created_at')
    .eq('id', user.id)
    .single();

  if (profileError || !profileData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h2 className="text-2xl font-semibold text-destructive mb-2">Failed to load profile</h2>
        <p className="text-muted-foreground">{profileError?.message || 'Profile not found.'}</p>
        <Button asChild className="mt-4">
          <a href="/dashboard">Go to Dashboard</a>
        </Button>
      </div>
    );
  }

  const userProfile = {
    id: profileData.id,
    name: profileData.name || '',
    email: profileData.email || '',
    role: profileData.role as any,
    status: profileData.status as any,
    siteId: profileData.site_id || undefined,
    smallGroupId: profileData.small_group_id || undefined,
    mandateStartDate: profileData.mandate_start_date || undefined,
    mandateEndDate: profileData.mandate_end_date || undefined,
    createdAt: profileData.created_at || undefined,
  } as const;

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

  const initialFilters = {
    user: userProfile,
    searchTerm: '',
    dateFilter: { rangeKey: 'all_time', display: 'All Time' },
    statusFilter: { planned: true, in_progress: true, delayed: true, executed: true, canceled: true },
    levelFilter: { national: true, site: true, small_group: true },
  };

  const initialActivities = await activityService.getFilteredActivities(initialFilters);

  return <ActivitiesClient initialActivities={initialActivities} user={userProfile} />;
}

