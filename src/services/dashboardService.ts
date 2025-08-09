// src/services/dashboardService.ts
'use client';

import type { ServiceResponse, Activity, Member, Report, Site, SiteWithDetails, SmallGroup, User, Financials } from '@/lib/types';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';
import { activityService } from './activityService';
import { memberService } from './memberService';
import siteService from './siteService';
import smallGroupService from './smallGroupService';
import { reportService } from './reportService';
import { financialsService } from './financialsService';

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
  getDashboardStats: async (user: User | null, dateFilter: DateFilterValue): Promise<ServiceResponse<DashboardStats>> => {
    if (!user) {
      return { success: false, error: { message: 'User not authenticated.' } };
    }

    try {
      // Fetch all data in parallel for efficiency
      // Helper to safely extract data from settled promises. Handles both direct data and ServiceResponse wrappers.
      const getResultData = <T>(result: PromiseSettledResult<T | ServiceResponse<T>>): T | null => {
        if (result.status === 'rejected') {
          console.error('[DashboardService] A promise was rejected:', result.reason);
          return null;
        }

        const value = result.value as any;
        // Handle ServiceResponse wrapper for legacy services
        if (typeof value === 'object' && value !== null && 'success' in value) {
          if (value.success) {
            return value.data || null;
          }
          console.error('[DashboardService] A service call failed:', value.error?.message);
          return null;
        }

        // Handle direct data for refactored services
        return value as T;
      };

      const results = await Promise.allSettled([
        activityService.getFilteredActivities({
          user,
          dateFilter,
          searchTerm: '',
          statusFilter: { PLANNED: true, EXECUTED: true, CANCELED: true },
          levelFilter: { national: true, site: true, small_group: true },
        }),
        memberService.getFilteredMembers({ user, dateFilter, searchTerm: '' }),
        reportService.getFilteredReports({ user, dateFilter, statusFilter: { approved: true, pending: true, rejected: true, submitted: true } }),
        siteService.getSitesWithDetails(user),
        smallGroupService.getFilteredSmallGroups({ user }),
        financialsService.getFinancials(user, dateFilter),
      ]);

      const activities = getResultData<Activity[]>(results[0]) || [];
      const members = getResultData<Member[]>(results[1]) || [];
      const approvedReports = getResultData<Report[]>(results[2]) || [];
      const sites = getResultData<SiteWithDetails[]>(results[3]) || [];
      const smallGroups = getResultData<SmallGroup[]>(results[4]) || [];
      const financials = getResultData<Financials>(results[5]);

      // --- Calculate Statistics ---

      // Activities
      const totalActivities = activities.length;
      const plannedActivities = activities.filter(a => a.status === 'PLANNED').length;
      const executedActivities = activities.filter(a => a.status === 'EXECUTED').length;
      const recentActivities = [...activities]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      // Members
      const totalMembers = members.length;
      const studentMembers = members.filter(m => m.type === 'student').length;
      const nonStudentMembers = members.filter(m => m.type === 'non-student').length;

      // Other totals
      const totalReports = approvedReports.length;
      const totalSites = sites.length;
      const totalSmallGroups = smallGroups.length;

      // Financials
      const netBalance = financials?.netBalance ?? 0;
      const totalIncome = financials?.income ?? 0;
      const totalExpenses = financials?.expenses ?? 0;

      // Data for charts
      const activityStatusData = [
        { status: 'Planned', count: activities.filter(a => a.status === 'PLANNED').length, fill: 'hsl(var(--chart-2))' },
        { status: 'Executed', count: activities.filter(a => a.status === 'EXECUTED').length, fill: 'hsl(var(--chart-1))' },
        { status: 'Canceled', count: activities.filter(a => a.status === 'CANCELED').length, fill: 'hsl(var(--chart-4))' },
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
        recentActivities,
        activityStatusData,
        memberTypeData,
      };

      return { success: true, data: stats };
    } catch (error) {
      const e = error instanceof Error ? error : new Error('An unknown error occurred');
      console.error('[DashboardService] Unexpected error in getDashboardStats:', e.message);
      return { success: false, error: { message: 'Failed to fetch dashboard stats' } };
    }
  },
};

export default dashboardService;
