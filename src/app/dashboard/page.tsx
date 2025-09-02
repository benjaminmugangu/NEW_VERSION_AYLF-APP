// src/app/dashboard/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import { DashboardClient } from './components/DashboardClient';
import { type DateFilterValue, type PredefinedRange } from '@/components/shared/DateRangeFilter';
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

async function getDashboardStats(userId: string, userRole: string, siteId: string | null, dateFilter: DateFilterValue): Promise<DashboardStats> {
    const supabase = await createSupabaseServerClient();

    try {
        // Skip RPC function for now and calculate stats directly

        // Get basic counts from tables
        const [activitiesResult, membersResult, reportsResult, sitesResult, smallGroupsResult] = await Promise.allSettled([
            supabase.from('activities').select('id, status, date, name').is('deleted_at', null).order('date', { ascending: false }),
            supabase.from('members').select('id, type'),
            supabase.from('reports').select('id'),
            supabase.from('sites').select('id'),
            supabase.from('small_groups').select('id')
        ]);

        const activities = activitiesResult.status === 'fulfilled' ? activitiesResult.value.data || [] : [];
        const members = membersResult.status === 'fulfilled' ? membersResult.value.data || [] : [];
        const reports = reportsResult.status === 'fulfilled' ? reportsResult.value.data || [] : [];
        const sites = sitesResult.status === 'fulfilled' ? sitesResult.value.data || [] : [];
        const smallGroups = smallGroupsResult.status === 'fulfilled' ? smallGroupsResult.value.data || [] : [];

        // Calculate stats
        const totalActivities = activities.length;
        const plannedActivities = activities.filter((a: any) => a.status === 'planned').length;
        const executedActivities = activities.filter((a: any) => a.status === 'executed').length;
        
        const totalMembers = members.length;
        const studentMembers = members.filter((m: any) => m.type === 'student').length;
        const nonStudentMembers = members.filter((m: any) => m.type === 'non-student').length;

        const recentActivities: any[] = activities.slice(0, 5).map((a: any) => ({
            id: a.id,
            title: a.name,
            thematic: 'General',
            date: a.date || new Date().toISOString(),
            status: a.status || 'planned',
            level: 'national' as const,
            siteId: undefined,
            smallGroupId: undefined,
            activityTypeId: 'default',
            createdBy: userId,
            createdAt: new Date().toISOString(),
        }));

        const activityStatusData = [
            { status: 'Planned', count: activities.filter((a: any) => a.status === 'planned').length, fill: 'hsl(var(--chart-2))' },
            { status: 'In Progress', count: activities.filter((a: any) => a.status === 'in_progress').length, fill: 'hsl(var(--chart-3))' },
            { status: 'Delayed', count: activities.filter((a: any) => a.status === 'delayed').length, fill: 'hsl(var(--chart-5))' },
            { status: 'Executed', count: activities.filter((a: any) => a.status === 'executed').length, fill: 'hsl(var(--chart-1))' },
            { status: 'Canceled', count: activities.filter((a: any) => a.status === 'canceled').length, fill: 'hsl(var(--chart-4))' },
        ];

        const memberTypeData = [
            { type: 'Students', count: studentMembers, fill: 'hsl(var(--chart-1))' },
            { type: 'Non-Students', count: nonStudentMembers, fill: 'hsl(var(--chart-4))' },
        ];

        // Get financial data from transactions table
        const { data: incomeData } = await supabase
            .from('transactions')
            .select('amount')
            .eq('type', 'income');
        
        const { data: expenseData } = await supabase
            .from('transactions')
            .select('amount')
            .eq('type', 'expense');

        const totalIncome = incomeData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const totalExpenses = expenseData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const netBalance = totalIncome - totalExpenses;

        return {
            totalActivities,
            plannedActivities,
            executedActivities,
            totalMembers,
            studentMembers,
            nonStudentMembers,
            totalReports: reports.length,
            totalSites: sites.length,
            totalSmallGroups: smallGroups.length,
            netBalance,
            totalIncome,
            totalExpenses,
            recentActivities,
            activityStatusData,
            memberTypeData,
        };
    } catch (error) {
        const e = error instanceof Error ? error : new Error('An unknown error occurred');
        console.error('Error fetching dashboard stats:', e);
        throw new Error('Could not fetch dashboard statistics.');
    }
}

export default async function DashboardPage(props: any) {
  const searchParams = await props.searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  // Get user profile from database instead of relying on user_metadata
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, name, site_id, small_group_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Profile error:', profileError);
    redirect('/login');
  }

  const userRole = profile.role;
  const userName = profile.name || user.email || 'Unknown User';
  const userSiteId = profile.site_id;

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
