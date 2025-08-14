// src/services/dashboardService.ts
'use client';

import type { Activity, Member, Report, Site, SiteWithDetails, SmallGroup, User, Financials } from '@/lib/types';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';
import activityService from './activityService';
import memberService from './memberService';
import siteService from './siteService';
import smallGroupService from './smallGroupService';
import reportService from './reportService';
import financialsService from './financialsService';

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
    if (!user) {
      throw new Error('User not authenticated.');
    }

    try {
      const [activities, members, reports, sites, smallGroups, financials] = await Promise.all([
        activityService.getFilteredActivities({
          user,
          dateFilter,
          searchTerm: '',
          statusFilter: { planned: true, executed: true, in_progress: true, delayed: true, canceled: true },
          levelFilter: { national: true, site: true, small_group: true },
        }),
        memberService.getFilteredMembers({ user, dateFilter, searchTerm: '' }),
        reportService.getFilteredReports({ user, dateFilter, statusFilter: { approved: true, pending: true, rejected: true, submitted: true } }),
        siteService.getSitesWithDetails(user),
        smallGroupService.getFilteredSmallGroups({ user }),
        financialsService.getFinancials(user, dateFilter),
      ]);

      // --- Calculate Statistics ---

      // Activities
      const totalActivities = activities.length;
      const plannedActivities = activities.filter(a => a.status === 'planned').length;
      const executedActivities = activities.filter(a => a.status === 'executed').length;
      const recentActivities = [...activities]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      // Members
      const totalMembers = members.length;
      const studentMembers = members.filter(m => m.type === 'student').length;
      const nonStudentMembers = members.filter(m => m.type === 'non-student').length;

      // Other totals
      const totalReports = reports.length;
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

      return {
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

    } catch (error) {
      const e = error instanceof Error ? error : new Error('An unknown error occurred');
      console.error('[DashboardService] Unexpected error in getDashboardStats:', e.message);
      throw new Error(`Failed to fetch dashboard stats: ${e.message}`);
    }
  },
};

export default dashboardService;
