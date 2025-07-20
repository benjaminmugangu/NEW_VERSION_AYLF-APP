// src/services/dashboardService.ts
'use client';

import type { ServiceResponse, Activity, Member, Report, Site, SmallGroup, User, Financials } from '@/lib/types';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';
import { activityService } from './activityService';
import { memberService } from './memberService';
import siteService from './siteService';
import smallGroupService from './smallGroupService';
import reportService from './reportService';
import { getFinancialStats } from './financials.service';

export interface DashboardStats {
  totalActivities: number;
  plannedActivities: number;
  executedActivities: number;
  cancelledActivities: number;
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
      const results = await Promise.allSettled([
        activityService.getFilteredActivities({ user, dateFilter }),
        memberService.getFilteredMembers({ user, dateFilter }),
                reportService.getFilteredReports({ user, dateFilter, statusFilter: { approved: true, pending: false, rejected: false, submitted: false } }),
        siteService.getFilteredSites({ user }), // Not date filtered
        smallGroupService.getFilteredSmallGroups({ user }), // Not date filtered
                getFinancialStats({ user, role: user.role }, dateFilter), // Financials are date filtered
      ]);

      // Helper to safely extract data from settled promises
      const getResultData = <T>(result: PromiseSettledResult<ServiceResponse<T>>): T | null => {
        if (result.status === 'fulfilled' && result.value.success) {
          return result.value.data || null;
        }
        if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)) {
          // Log the error for debugging, but don't crash the dashboard

        }
        return null;
      };

      const activities = getResultData<Activity[]>(results[0]) || [];
      const members = getResultData<Member[]>(results[1]) || [];
      const approvedReports = getResultData<Report[]>(results[2]) || [];
      const sites = getResultData<Site[]>(results[3]) || [];
      const smallGroups = getResultData<SmallGroup[]>(results[4]) || [];
      const financials = getResultData<Financials>(results[5]);

      // --- Calculate Statistics ---

      // Activities
      const totalActivities = activities.length;
      const plannedActivities = activities.filter(a => a.status === 'planned').length;
      const executedActivities = activities.filter(a => a.status === 'executed').length;
      const cancelledActivities = activities.filter(a => a.status === 'cancelled').length;
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
      const totalIncome = financials?.totalRevenue ?? 0;
      const totalExpenses = financials?.totalExpenses ?? 0;

      // Data for charts
      const activityStatusData = [
        { status: 'Planned', count: plannedActivities, fill: 'hsl(var(--chart-2))' },
        { status: 'Executed', count: executedActivities, fill: 'hsl(var(--chart-1))' },
        { status: 'Cancelled', count: cancelledActivities, fill: 'hsl(var(--chart-5))' },
      ];

      const memberTypeData = [
        { type: 'Students', count: studentMembers, fill: 'hsl(var(--chart-1))' },
        { type: 'Non-Students', count: nonStudentMembers, fill: 'hsl(var(--chart-4))' },
      ];

      const stats: DashboardStats = {
        totalActivities,
        plannedActivities,
        executedActivities,
        cancelledActivities,
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

      return { success: false, error: { message: 'Failed to fetch dashboard stats' } };
    }
  },
};

export default dashboardService;
