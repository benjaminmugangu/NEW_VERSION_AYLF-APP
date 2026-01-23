// src/app/dashboard/activities/page.tsx
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from 'next/navigation';
// Avoid using profileService here because it relies on a browser client; use server client directly.
import * as activityService from '@/services/activityService';
import { ActivitiesClient } from './components/ActivitiesClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
import { ROLES } from '@/lib/constants';
import { PageHeader } from '@/components/shared/PageHeader';
import { Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ALLOWED_ROLES = [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER];

export default async function ActivitiesPage() {
  const { getUser } = getKindeServerSession();
  let user;
  try {
    user = await getUser();
  } catch (error) {
    console.error("Error fetching user session:", error);
    redirect('/api/auth/login');
  }

  if (!user || !user.id) {
    redirect('/api/auth/login');
  }

  // Fetch profile using Prisma service
  const profileService = await import('@/services/profileService');
  const profileResponse = await profileService.getProfile(user.id);

  if (!profileResponse.success || !profileResponse.data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h2 className="text-2xl font-semibold text-destructive mb-2">Profile not found</h2>
        <p className="text-muted-foreground">Please contact your administrator.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const userProfile = profileResponse.data;

  if (!ALLOWED_ROLES.includes(userProfile.role as any)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h2 className="text-2xl font-semibold text-destructive mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const initialFilters = {
    user: userProfile,
    searchTerm: '',
    dateFilter: { rangeKey: 'all_time', display: 'All Time' } as const,
    statusFilter: { planned: true, in_progress: true, delayed: true, executed: true, canceled: true },
    levelFilter: { national: true, site: true, small_group: true },
  };

  const activityResponse = await activityService.getFilteredActivities(initialFilters);
  const initialActivities = activityResponse.success ? (activityResponse.data || []) : [];

  return <ActivitiesClient initialActivities={initialActivities} user={userProfile} />;
}

