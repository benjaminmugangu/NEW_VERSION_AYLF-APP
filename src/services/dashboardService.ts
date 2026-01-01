// src/services/dashboardService.ts


import type { Activity, Member, Report, Site, SiteWithDetails, SmallGroup, User, Financials } from '@/lib/types';
import type { DateFilterValue } from '@/lib/dateUtils';
import * as activityService from './activityService';
import * as memberService from './memberService';
import * as siteService from './siteService';
import * as smallGroupService from './smallGroupService';
import * as reportService from './reportService';
import * as financialsService from './financialsService';
import { ensurePOJO } from '@/lib/serialization';

export interface DashboardStats {
  totalActivities: number;
  plannedActivities: number;
  executedActivities: number;
  totalMembers: number;
  studentMembers: number;
  nonStudentMembers: number;
  totalReports: number;
  totalSites: number;
  totalSmallGroups: number;
  netBalance: number;
  totalIncome: number;
  totalExpenses: number;
  recentActivities: Activity[];
  activityStatusData: { status: string; count: number; fill: string }[];
  memberTypeData: { type: string; count: number; fill: string }[];
}

const dashboardService = {
  getDashboardStats: async (user: User | null, dateFilter: DateFilterValue): Promise<DashboardStats> => {
    console.log("[DASHBOARD_SERVICE] Starting stats fetch for user:", user?.id);
    if (!user) {
      console.error("[DASHBOARD_SERVICE] No user provided");
      throw new Error('User not authenticated.');
    }

    try {
      // Fetch all data in parallel for efficiency
      const getResultData = <T>(result: PromiseSettledResult<T>, label: string): T | null => {
        if (result.status === 'rejected') {
          console.error(`[DASHBOARD_SERVICE] ${label} rejected:`, result.reason);
          return null;
        }
        return result.value;
      };

      console.log("[DASHBOARD_SERVICE] Initiating parallel data fetching...");
      console.log("[DASHBOARD_SERVICE] Initiating batched data fetching...");

      // Batch 1: Structural Data (Sites, Groups) - Critical for context
      const [sitesResult, smallGroupsResult] = await Promise.allSettled([
        siteService.getSitesWithDetails(user),
        smallGroupService.getFilteredSmallGroups({ user }),
      ]);

      // Batch 2: Activity & Member Data (High Volume)
      const [activitiesResult, membersResult] = await Promise.allSettled([
        activityService.getFilteredActivities({
          user,
          dateFilter: undefined,
          searchTerm: '',
          statusFilter: { planned: true, executed: true, in_progress: true, delayed: true, canceled: true },
          levelFilter: { national: true, site: true, small_group: true },
        }),
        memberService.getFilteredMembers({ user, dateFilter: undefined, searchTerm: '' }),
      ]);

      // Batch 3: Financials & Reports (Complex Aggregations)
      const [reportsResult, financialsResult] = await Promise.allSettled([
        reportService.getFilteredReports({ user, dateFilter: undefined, statusFilter: { approved: true, pending: true, rejected: true, submitted: true } }),
        financialsService.getFinancials(user, dateFilter),
      ]);

      const results = [
        activitiesResult,
        membersResult,
        reportsResult,
        sitesResult,
        smallGroupsResult,
        financialsResult
      ];
      console.log("[DASHBOARD_SERVICE] All data fetch settled.");

      const activities = getResultData<Activity[]>(results[0] as PromiseSettledResult<Activity[]>, "Activities") || [];
      const members = getResultData<Member[]>(results[1] as PromiseSettledResult<Member[]>, "Members") || [];
      const approvedReports = getResultData<Report[]>(results[2] as PromiseSettledResult<Report[]>, "Reports") || [];
      const sites = getResultData<SiteWithDetails[]>(results[3] as PromiseSettledResult<SiteWithDetails[]>, "Sites") || [];
      const smallGroups = getResultData<SmallGroup[]>(results[4] as PromiseSettledResult<SmallGroup[]>, "SmallGroups") || [];
      const financials = getResultData<Financials>(results[5] as PromiseSettledResult<Financials>, "Financials");

      // --- Calculate Statistics ---

      // Activities
      const totalActivities = activities.length;
      const plannedActivities = activities.filter(a => a.status === 'planned').length;
      const executedActivities = activities.filter(a => a.status === 'executed').length;

      console.log("[DASHBOARD_SERVICE] Mapping recent activities...");
      const recentActivities = [...activities].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      })
        .slice(0, 5)
        .map(activity => ({
          id: activity.id,
          title: activity.title,
          thematic: activity.thematic,
          date: activity.date, // already ISO string from activityService
          status: activity.status,
          level: activity.level,
          siteId: activity.siteId,
          smallGroupId: activity.smallGroupId,
          participantsCount: activity.participantsCount,
          createdAt: activity.createdAt,
          siteName: activity.siteName,
          smallGroupName: activity.smallGroupName,
          activityTypeName: activity.activityTypeName
        }));

      // Members
      const totalMembers = members.length;
      const studentMembers = members.filter(m => m.type === 'student').length;
      const nonStudentMembers = members.filter(m => m.type === 'non-student').length;

      const totalReports = approvedReports.length;
      const totalSites = sites.length;
      const totalSmallGroups = smallGroups.length;

      // Financials
      const netBalance = financials?.netBalance ?? 0;
      const totalIncome = financials?.income ?? 0;
      const totalExpenses = financials?.expenses ?? 0;

      // Data for charts
      const activityStatusData = [
        { status: 'Planned', count: activities.filter(a => a.status === 'planned').length, fill: 'hsl(var(--chart-2))' },
        { status: 'In Progress', count: activities.filter(a => a.status === 'in_progress').length, fill: 'hsl(var(--chart-3))' },
        { status: 'Delayed', count: activities.filter(a => a.status === 'delayed').length, fill: 'hsl(var(--chart-5))' },
        { status: 'Executed', count: activities.filter(a => a.status === 'executed').length, fill: 'hsl(var(--chart-1))' },
        { status: 'Canceled', count: activities.filter(a => a.status === 'canceled').length, fill: 'hsl(var(--chart-4))' },
      ];

      const memberTypeData = [
        { type: 'Students', count: studentMembers, fill: 'hsl(var(--chart-1))' },
        { type: 'Non-Students', count: nonStudentMembers, fill: 'hsl(var(--chart-4))' },
      ];

      const stats: DashboardStats = {
        totalActivities,
        plannedActivities,
        executedActivities,
        totalMembers,
        studentMembers,
        nonStudentMembers,
        totalReports,
        totalSites,
        totalSmallGroups,
        netBalance,
        totalIncome,
        totalExpenses,
        recentActivities: recentActivities as any,
        activityStatusData,
        memberTypeData,
      };

      console.log("[DASHBOARD_SERVICE] Stats calculation complete. Ensuring POJO compliance...");
      return ensurePOJO(stats);
    } catch (error) {
      const e = error instanceof Error ? error : new Error('An unknown error occurred');
      console.error('[DASHBOARD_SERVICE] CRITICAL ERROR:', e.message, e.stack);
      throw new Error('Failed to fetch dashboard stats');
    }
  },
};;

export default dashboardService;
