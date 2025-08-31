// src/app/dashboard/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import { DashboardClient } from './components/DashboardClient';
import { type DateFilterValue, getDateRange, type PredefinedRange } from '@/components/shared/DateRangeFilter';
import { type DashboardStats } from '@/services/dashboardService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';

const isPredefinedRange = (key: any): key is PredefinedRange => {
  const ranges: PredefinedRange[] = [
    'all_time', 'today', 'this_week', 'last_week', 'this_month', 'last_month',
    'this_year', 'specific_period', 'last_7_days', 'last_30_days', 'last_90_days',
    'last_12_months', 'custom'
  ];
  return ranges.includes(key);
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

  const predefinedRange = getDateRange(rangeKey);
  return {
    rangeKey,
    from: predefinedRange.from?.toISOString(),
    to: predefinedRange.to?.toISOString(),
    display: predefinedRange.display,
  };
};

async function getDashboardStats(userId: string, userRole: string, siteId: string | null, dateFilter: DateFilterValue): Promise<DashboardStats> {
    const supabase = createClient(process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data, error } = await supabase.rpc('get_dashboard_stats', {
        p_user_id: userId,
        p_user_role: userRole,
        p_site_id: siteId,
        p_start_date: dateFilter.from,
        p_end_date: dateFilter.to,
    });

    if (error) {
        console.error('Error fetching dashboard stats:', error);
        throw new Error('Could not fetch dashboard statistics.');
    }

    // The RPC function returns a JSON object that should match the DashboardStats interface.
    // We might need to handle potential inconsistencies, e.g., numbers returned as strings.
    return {
        ...data,
        netBalance: Number(data.net_balance),
        totalIncome: Number(data.total_income),
        totalExpenses: Number(data.total_expenses),
    } as DashboardStats;
}

export default async function DashboardPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const supabase = createClient();

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    redirect('/login');
  }

  const user = session.user;
  const userRole = user.user_metadata.role;
  const userName = user.user_metadata.name;
  const userSiteId = user.user_metadata.site_id || null;

  if (userRole !== ROLES.NATIONAL_COORDINATOR && userRole !== ROLES.SITE_COORDINATOR) {
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

  try {
    const stats = await getDashboardStats(user.id, userRole, userSiteId, dateFilter);

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
