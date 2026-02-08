// src/services/dashboardService.ts
'use server';

import type { Activity, Member, Report, SiteWithDetails, SmallGroup, User, Financials, ServiceResponse } from '@/lib/types';
import { ErrorCode } from '@/lib/types';
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
  centralReserve?: number;
  fieldFloat?: number;
  annualBudget?: number;
  totalGlobalExpenses?: number;
  recentActivities: Activity[];
  activityStatusData: { status: string; count: number; fill: string }[];
  memberTypeData: { type: string; count: number; fill: string }[];
}

export async function getDashboardStats(user: User | null, dateFilter: DateFilterValue): Promise<ServiceResponse<DashboardStats>> {
  try {
    if (!user) return { success: false, error: { message: 'User not authenticated', code: ErrorCode.UNAUTHORIZED } };

    const getResultData = <T>(result: PromiseSettledResult<ServiceResponse<T>>, label: string): T | null => {
      if (result.status === 'rejected') {
        console.error(`[DASHBOARD_SERVICE] ${label} rejected:`, result.reason);
        return null;
      }
      if (!result.value.success) {
        console.error(`[DASHBOARD_SERVICE] ${label} response error:`, result.value.error?.message);
        return null;
      }
      return result.value.data as T;
    };

    // Batch 1: Structural Data
    const [sitesResult, smallGroupsResult] = await Promise.allSettled([
      siteService.getSitesWithDetails(user),
      smallGroupService.getFilteredSmallGroups({ user }),
    ]);

    // Batch 2: Activity & Member Data
    const [activitiesResult, membersResult] = await Promise.allSettled([
      activityService.getFilteredActivities({
        user,
        dateFilter: dateFilter, // Applied!
        searchTerm: '',
        statusFilter: { planned: true, executed: true, in_progress: true, delayed: true, canceled: true },
        levelFilter: { national: true, site: true, small_group: true },
      }),
      memberService.getFilteredMembers({ user, dateFilter: dateFilter, searchTerm: '' }), // Applied!
    ]);

    // Batch 3: Financials & Reports
    const [reportsResult, financialsResult] = await Promise.allSettled([
      reportService.getFilteredReports({
        user,
        dateFilter: dateFilter, // Applied!
        statusFilter: { approved: true, pending: true, rejected: true, submitted: true }
      }),
      financialsService.getFinancials(user, dateFilter),
    ]);

    const activities = getResultData<Activity[]>(activitiesResult as any, "Activities") || [];
    const members = getResultData<Member[]>(membersResult as any, "Members") || [];
    const reports = getResultData<Report[]>(reportsResult as any, "Reports") || [];
    const sites = getResultData<SiteWithDetails[]>(sitesResult as any, "Sites") || [];
    const smallGroups = getResultData<SmallGroup[]>(smallGroupsResult as any, "SmallGroups") || [];
    const financials = getResultData<Financials>(financialsResult as any, "Financials");

    // Activities
    const totalActivities = activities.length;
    const plannedActivities = activities.filter(a => a.status === 'planned').length;
    const executedActivities = activities.filter(a => a.status === 'executed').length;

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
        date: activity.date,
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

    const totalReports = reports.length;
    const totalSites = sites.length;
    const totalSmallGroups = smallGroups.length;

    // Financials
    const netBalance = financials?.netBalance ?? 0;
    const totalIncome = financials?.income ?? 0;
    // For NC, totalExpenses on dashboard should include both accounted transactions and reported activity expenses
    const totalExpenses = (financials?.expenses ?? 0) + (financials?.totalSpent ?? 0);

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
      centralReserve: financials?.centralReserve ?? 0,
      fieldFloat: financials?.fieldFloat ?? 0,
      annualBudget: financials?.annualBudget ?? 0,
      totalGlobalExpenses: financials?.totalGlobalExpenses ?? 0,
      recentActivities: recentActivities as any,
      activityStatusData,
      memberTypeData,
    };

    return { success: true, data: ensurePOJO(stats) };
  } catch (error: any) {
    console.error('[DASHBOARD_SERVICE] CRITICAL ERROR:', error.message);
    return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
  }
}

