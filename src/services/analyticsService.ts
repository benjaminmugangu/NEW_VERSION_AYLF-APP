import { prisma } from '@/lib/prisma';
import { User } from '@/lib/types';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface AnalyticsMetrics {
    activeMembers: number;
    ongoingActivities: number;
    pendingReports: number;
    budgetUtilization: number;
}

export interface TrendData {
    month: string;
    count: number;
}

export interface SitePerformance {
    siteId: string;
    siteName: string;
    completionRate: number;
    totalActivities: number;
    completedActivities: number;
}

export interface ActivityTypeDistribution {
    type: string;
    count: number;
    fill: string;
}

export interface AdvancedDashboardData {
    metrics: AnalyticsMetrics;
    trends: {
        memberGrowth: TrendData[];
        activityCompletion: TrendData[];
        budgetForecast: TrendData[];
    };
    comparisons: {
        sitePerformance: SitePerformance[];
        activityTypes: ActivityTypeDistribution[];
    };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

/**
 * Get advanced dashboard analytics
 */
export async function getAdvancedDashboard(
    user: User,
    timeRange: 'month' | 'quarter' | 'year' = 'month'
): Promise<AdvancedDashboardData> {
    const where = buildUserFilter(user);
    const periodRange = getPeriodRange(timeRange);

    // 1. Check if the requested period range contains closed periods
    const closedPeriods = await prisma.accountingPeriod.findMany({
        where: {
            status: 'closed',
            startDate: { lte: endOfMonth(new Date()) },
            endDate: { gte: subMonths(new Date(), periodRange) },
        },
        orderBy: { endDate: 'desc' }
    });

    // Calculate metrics
    const [
        activeMembers,
        ongoingActivities,
        pendingReports,
        budgetData
    ] = await Promise.all([
        countActiveMembers(where),
        countOngoingActivities(where),
        countPendingReports(where),
        getBudgetUtilization(user, closedPeriods),
    ]);

    // Calculate trends
    const [memberGrowth, activityCompletion, budgetForecast] = await Promise.all([
        getMemberGrowthTrend(where, periodRange),
        getActivityCompletionTrend(where, periodRange),
        getBudgetForecastTrend(user, periodRange),
    ]);

    // Get comparisons
    const [sitePerformance, activityTypes] = await Promise.all([
        getSitePerformanceComparison(user),
        getActivityTypeDistribution(where),
    ]);

    return {
        metrics: {
            activeMembers,
            ongoingActivities,
            pendingReports,
            budgetUtilization: budgetData.utilization,
        },
        trends: {
            memberGrowth,
            activityCompletion,
            budgetForecast,
        },
        comparisons: {
            sitePerformance,
            activityTypes,
        },
    };
}

// ------ Helper Functions ------

function buildUserFilter(user: User): any {
    const where: any = {};

    if (user.role === 'SITE_COORDINATOR' && user.siteId) {
        where.siteId = user.siteId;
    } else if (user.role === 'SMALL_GROUP_LEADER' && user.smallGroupId) {
        where.smallGroupId = user.smallGroupId;
    }

    return where;
}

function getPeriodRange(timeRange: 'month' | 'quarter' | 'year'): number {
    switch (timeRange) {
        case 'month':
            return 6; // Last 6 months
        case 'quarter':
            return 4; // Last 4 quarters (12 months)
        case 'year':
            return 3; // Last 3 years
        default:
            return 6;
    }
}

async function countActiveMembers(where: any): Promise<number> {
    return await prisma.member.count({
        where: {
            ...where,
            status: 'active',
        },
    });
}

async function countOngoingActivities(where: any): Promise<number> {
    return await prisma.activity.count({
        where: {
            ...where,
            status: {
                in: ['planned', 'in_progress'],
            },
        },
    });
}

async function countPendingReports(where: any): Promise<number> {
    return await prisma.report.count({
        where: {
            ...where,
            status: {
                in: ['pending', 'submitted'],
            },
        },
    });
}

async function getBudgetUtilization(user: User, closedPeriods: any[]): Promise<{ utilization: number }> {
    let entityId: string | null = null;
    let entityType: 'site' | 'smallGroup' | 'national' = 'national';

    if (user.role === 'SITE_COORDINATOR' && user.siteId) {
        entityId = user.siteId;
        entityType = 'site';
    } else if (user.role === 'SMALL_GROUP_LEADER' && user.smallGroupId) {
        entityId = user.smallGroupId;
        entityType = 'smallGroup';
    }

    // ANTI-MIRAGE: Check if current month is closed
    const currentMonthStart = startOfMonth(new Date());
    const snapshot = closedPeriods.find(p => p.startDate.getTime() === currentMonthStart.getTime());

    if (snapshot && snapshot.snapshotData) {
        const data = snapshot.snapshotData as any;
        const entityKey = entityId || 'national';
        if (data[entityKey]) {
            return { utilization: Math.round(data[entityKey].utilization || 0) };
        }
    }

    if (!entityId && entityType !== 'national') {
        return { utilization: 0 };
    }

    // Get total income and expenses
    const where: any = {};
    if (entityType === 'site') {
        where.siteId = entityId;
    } else if (entityType === 'smallGroup') {
        where.smallGroupId = entityId;
    }

    const [incomeTotal, expenseTotal] = await Promise.all([
        prisma.financialTransaction.aggregate({
            where: {
                ...where,
                type: 'income',
                status: 'approved'
            },
            _sum: { amount: true },
        }),
        prisma.financialTransaction.aggregate({
            where: {
                ...where,
                type: 'expense',
                status: 'approved'
            },
            _sum: { amount: true },
        }),
    ]);

    const income = incomeTotal._sum.amount || 0;
    const expenses = expenseTotal._sum.amount || 0;

    const utilization = income > 0 ? (expenses / income) * 100 : 0;

    return { utilization: Math.round(utilization) };
}

async function getMemberGrowthTrend(where: any, periods: number): Promise<TrendData[]> {
    const trend: TrendData[] = [];

    for (let i = periods - 1; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        const count = await prisma.member.count({
            where: {
                ...where,
                createdAt: {
                    lte: end,
                },
            },
        });

        trend.push({
            month: format(date, 'MMM yyyy'),
            count,
        });
    }

    return trend;
}

async function getActivityCompletionTrend(where: any, periods: number): Promise<TrendData[]> {
    const trend: TrendData[] = [];

    for (let i = periods - 1; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        const completed = await prisma.activity.count({
            where: {
                ...where,
                status: 'executed',
                date: {
                    gte: start,
                    lte: end,
                },
            },
        });

        trend.push({
            month: format(date, 'MMM yyyy'),
            count: completed,
        });
    }

    return trend;
}

async function getBudgetForecastTrend(user: User, periods: number): Promise<TrendData[]> {
    // Simple forecast based on average spending
    const trend: TrendData[] = [];

    const where = buildUserFilter(user);

    // Get last 3 months average
    const threeMonthsAgo = subMonths(new Date(), 3);

    const avgExpense = await prisma.financialTransaction.aggregate({
        where: {
            ...where,
            type: 'expense',
            date: { gte: threeMonthsAgo },
        },
        _avg: { amount: true },
    });

    const avgMonthlyExpense = avgExpense._avg.amount || 0;

    // Project forward
    for (let i = 0; i < periods; i++) {
        const date = subMonths(new Date(), -(i + 1));
        trend.push({
            month: format(date, 'MMM yyyy'),
            count: Math.round(avgMonthlyExpense),
        });
    }

    return trend;
}

async function getSitePerformanceComparison(user: User): Promise<SitePerformance[]> {
    if (user.role !== 'NATIONAL_COORDINATOR') {
        return [];
    }

    // ANTI-MIRAGE: Check if current month is closed
    const currentMonthStart = startOfMonth(new Date());
    const closedPeriod = await prisma.accountingPeriod.findFirst({
        where: {
            status: 'closed',
            startDate: { equals: currentMonthStart }
        }
    });

    if (closedPeriod && closedPeriod.snapshotData) {
        const data = closedPeriod.snapshotData as any;
        if (data.sitePerformance) {
            return data.sitePerformance as SitePerformance[];
        }
    }

    const sites = await prisma.site.findMany({
        select: {
            id: true,
            name: true,
        },
    });

    const performance: SitePerformance[] = [];

    for (const site of sites) {
        const [total, completed] = await Promise.all([
            prisma.activity.count({ where: { siteId: site.id } }),
            prisma.activity.count({ where: { siteId: site.id, status: 'executed' } }),
        ]);

        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        performance.push({
            siteId: site.id,
            siteName: site.name,
            completionRate,
            totalActivities: total,
            completedActivities: completed,
        });
    }

    return performance.sort((a, b) => b.completionRate - a.completionRate);
}

async function getActivityTypeDistribution(where: any): Promise<ActivityTypeDistribution[]> {
    const activities = await prisma.activity.groupBy({
        by: ['activityTypeId'],
        where,
        _count: true,
    });

    // Fetch activity type names
    const typeIds = activities.map(a => a.activityTypeId).filter(Boolean);
    const activityTypes = await prisma.activityType.findMany({
        where: { id: { in: typeIds as string[] } },
    });

    const typeMap = new Map(activityTypes.map(t => [t.id, t.name]));

    return activities.map((item, index) => ({
        type: typeMap.get(item.activityTypeId!) || 'Autre',
        count: item._count,
        fill: COLORS[index % COLORS.length],
    }));
}

const analyticsService = {
    getAdvancedDashboard,
};

export default analyticsService;
