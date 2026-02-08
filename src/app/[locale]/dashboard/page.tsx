// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import { DashboardClient } from './components/DashboardClient';
import { type DateFilterValue, type PredefinedRange } from '@/lib/dateUtils';
import { getDashboardStats } from '@/services/dashboardService';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { withRLS } from "@/lib/prisma";
import { getSyncProfile } from '@/services/authService';

// Role-based helper for search params (optional but cleaner)
const getDateFilterFromParams = (searchParams: any): DateFilterValue => {
  const { getDateRangeFromFilterValue } = require('@/lib/dateUtils');
  const rangeKey = searchParams?.rangeKey || 'all_time';

  // Return a standard DateFilterValue
  return {
    rangeKey: rangeKey as any,
    from: searchParams?.from,
    to: searchParams?.to,
    display: searchParams?.display || 'Filtered Range', // Components will handle display
    specificYear: searchParams?.specificYear,
    specificMonth: searchParams?.specificMonth,
  };
};

// No longer needed, logic moved to service or handled by DateFilterValue

export default async function DashboardPage(props: any) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const { getUser, isAuthenticated } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  const kindeUserOrig = await getUser();

  if (!isAuth || !kindeUserOrig) {
    redirect('/api/auth/login');
  }

  // Robustly fetch and sync profile
  const userProfile = await getSyncProfile(kindeUserOrig);
  const effectiveUserId = userProfile.id;

  return await withRLS(effectiveUserId, async () => {
    const userRole = userProfile.role;
    const userName = userProfile.name || userProfile.email || 'User';

    // Role-based redirection
    if (userRole === ROLES.SITE_COORDINATOR) redirect('/dashboard/site-coordinator');
    if (userRole === ROLES.SMALL_GROUP_LEADER) redirect('/dashboard/small-group-leader');
    if (userRole === ROLES.MEMBER) redirect('/dashboard/member');

    // NC View Check
    if (userRole !== ROLES.NATIONAL_COORDINATOR) {
      return (
        <div className="p-4">
          <PageHeader title="Access Denied" description="You do not have permission to view the national dashboard." />
        </div>
      );
    }

    const dateFilter = getDateFilterFromParams(searchParams);

    try {
      console.log("[DASHBOARD_PAGE] Fetching dashboard stats for NC...");
      const response = await getDashboardStats(userProfile, dateFilter);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch dashboard statistics');
      }

      const stats = response.data;

      return (
        <DashboardClient
          initialStats={stats}
          userName={userName}
          userRole={userRole}
          initialDateFilter={dateFilter}
        />
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error('An unknown error occurred');
      console.error("[DASHBOARD_PAGE] Error fetching stats:", err);
      return (
        <div className="p-4">
          <PageHeader title="Error" description="Unable to load dashboard statistics." />
          <Card className="mt-4">
            <CardContent className="pt-6">
              <p className="text-destructive font-semibold">{err.message}</p>
            </CardContent>
          </Card>
        </div>
      );
    }
  });
}
