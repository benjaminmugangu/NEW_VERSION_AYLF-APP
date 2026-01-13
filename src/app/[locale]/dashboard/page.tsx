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

const isPredefinedRange = (key: any): key is PredefinedRange => {
  const ranges: PredefinedRange[] = [
    'all_time', 'today', 'this_week', 'last_week', 'this_month', 'last_month',
    'this_year', 'specific_period', 'last_7_days', 'last_30_days', 'last_90_days',
    'last_12_months', 'custom'
  ];
  return ranges.includes(key);
};

// Server-side date range calculation
const getServerDateRange = (rangeKey: PredefinedRange): { from?: Date; to?: Date; display: string } => {
  const now = new Date();
  let from: Date | undefined;
  let to: Date | undefined;
  let display = '';

  switch (rangeKey) {
    case 'all_time': display = 'All Time'; break;
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      display = 'Today';
      break;
    case 'this_week':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      from = startOfWeek; to = endOfWeek;
      display = 'This Week';
      break;
    case 'this_month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      display = 'This Month';
      break;
    case 'this_year':
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      display = 'This Year';
      break;
    default:
      const predefined = getServerDateRange('all_time');
      return predefined;
  }
  return { from, to, display };
};

// Helper function to get date filter from search params
const getDateFilterFromParams = (searchParams: { [key: string]: string | string[] | undefined }): DateFilterValue => {
  const rangeKeyParam = searchParams?.rangeKey as string;
  const rangeKey = isPredefinedRange(rangeKeyParam) ? rangeKeyParam : 'all_time';
  const from = searchParams?.from as string;
  const to = searchParams?.to as string;

  if (rangeKey === 'custom' && from && to) {
    return {
      rangeKey: 'custom',
      from: from, to: to,
      display: `From ${new Date(from).toLocaleDateString()} to ${new Date(to).toLocaleDateString()}`,
    };
  }

  const predefinedRange = getServerDateRange(rangeKey);
  return {
    rangeKey,
    from: predefinedRange.from?.toISOString(),
    to: predefinedRange.to?.toISOString(),
    display: predefinedRange.display,
  };
};

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
