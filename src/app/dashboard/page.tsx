// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import { DashboardClient } from './components/DashboardClient';
import { type DateFilterValue, type PredefinedRange } from '@/lib/dateUtils';
import dashboardService from '@/services/dashboardService';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from "@/lib/prisma";
import { User } from "@/lib/types";

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
    case 'all_time':
      display = 'All Time';
      break;
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
      from = startOfWeek;
      to = endOfWeek;
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
    case 'last_7_days':
      from = new Date(now);
      from.setDate(now.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      display = 'Last 7 Days';
      break;
    case 'last_30_days':
      from = new Date(now);
      from.setDate(now.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      display = 'Last 30 Days';
      break;
    default:
      display = 'All Time';
      break;
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
      from: from,
      to: to,
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
  const { getUser, isAuthenticated } = getKindeServerSession();
  const isAuth = await isAuthenticated();

  if (!isAuth) {
    redirect('/api/auth/login');
  }

  const kindeUser = await getUser();
  if (!kindeUser) {
    redirect('/api/auth/login');
  }

  // Récupérer le profil Prisma
  const profile = await prisma.profile.findUnique({
    where: { id: kindeUser.id },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      siteId: true,
      smallGroupId: true,
      status: true
    }
  });

  if (!profile) {
    console.error('Profile not found for user:', kindeUser.id);
    redirect('/api/auth/login');
  }

  const userRole = profile.role;
  const userName = profile.name || profile.email || 'Unknown User';

  // Role-based redirection
  if (userRole === ROLES.SITE_COORDINATOR) {
    redirect('/dashboard/site-coordinator');
  }
  if (userRole === ROLES.SMALL_GROUP_LEADER) {
    redirect('/dashboard/small-group-leader');
  }
  if (userRole === ROLES.MEMBER) {
    redirect('/dashboard/member');
  }

  // Allow access for National Coordinator (or fallback)
  if (userRole !== ROLES.NATIONAL_COORDINATOR) {
    return (
      <div className="p-4">
        <PageHeader title="Access Denied" description="You do not have permission to view this page." />
        <Card className="mt-4">
          <CardContent className="pt-6">
            <p>Please contact an administrator if you believe this is an error.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dateFilter = getDateFilterFromParams(searchParams);

  // Construct User object for service
  const user: User = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as any,
    siteId: profile.siteId,
    smallGroupId: profile.smallGroupId,
    status: profile.status as any
  };

  try {
    const stats = await dashboardService.getDashboardStats(user, dateFilter);

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
    return (
      <div className="p-4">
        <PageHeader title="Error" description="Failed to load dashboard data." />
        <Card className="mt-4">
          <CardContent className="pt-6">
            <p className="text-red-500">{err.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
}

