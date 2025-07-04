// src/services/dashboardService.ts
'use client';

import {
  mockActivities,
  mockMembers,
  mockReports,
  mockSites,
  mockSmallGroups,
  mockFundAllocations,
} from '@/lib/mockData';
import type { ServiceResponse, Activity, Member, Report, Site, SmallGroup, FundAllocation } from '@/lib/types';
import { applyDateFilter, type DateFilterValue } from '@/components/shared/DateRangeFilter';
import reportService from './report.service';

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

const emptyDashboardStats: DashboardStats = {
  totalActivities: 0,
  plannedActivities: 0,
  executedActivities: 0,
  cancelledActivities: 0,
  totalMembers: 0,
  studentMembers: 0,
  nonStudentMembers: 0,
  totalReports: 0,
  totalSites: 0,
  totalSmallGroups: 0,
  netBalance: 0,
  totalIncome: 0,
  totalExpenses: 0,
  recentActivities: [],
  activityStatusData: [],
  memberTypeData: [],
};

const dashboardService = {
  getDashboardStats: async (dateFilter: DateFilterValue): Promise<ServiceResponse<DashboardStats>> => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    try {
      // Apply date filters
      const filteredActivities = applyDateFilter(mockActivities, dateFilter);
      const filteredMembers = applyDateFilter(mockMembers.map(m => ({ ...m, date: m.joinDate })), dateFilter);
      const reportServiceResponse = await reportService.getReportsWithDetails({ dateRange: dateFilter, status: 'approved' });
      const approvedReports = reportServiceResponse.success ? reportServiceResponse.data : [];
      const filteredReports = approvedReports || []; // Already filtered by date in service
      const filteredFundAllocations = applyDateFilter(mockFundAllocations.map(a => ({ ...a, date: a.allocationDate })), dateFilter);

      // Calculate stats
      const totalActivities = filteredActivities.length;
      const plannedActivities = filteredActivities.filter(a => a.status === 'planned').length;
      const executedActivities = filteredActivities.filter(a => a.status === 'executed').length;
      const cancelledActivities = filteredActivities.filter(a => a.status === 'cancelled').length;

      const totalMembers = filteredMembers.length;
      const studentMembers = filteredMembers.filter(m => m.type === 'student').length;
      const nonStudentMembers = filteredMembers.filter(m => m.type === 'non-student').length;

      const totalReports = filteredReports.length;
      const totalSites = mockSites.length; // Not date filtered
      const totalSmallGroups = mockSmallGroups.length; // Not date filtered

      // Financial calculations
      const totalIncome = 0; // Placeholder: Income source is not defined in allocations

      const fundsDistributedToSites = filteredFundAllocations
        .filter(a => a.senderType === 'national' && a.recipientType === 'site')
        .reduce((sum, a) => sum + a.amount, 0);

      const reportExpenses = filteredReports.reduce((sum, r) => sum + (r.expenses || 0), 0);

      const totalExpenses = fundsDistributedToSites + reportExpenses;
      const netBalance = totalIncome - totalExpenses;

      const recentActivities = [...filteredActivities]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

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
      console.error('Failed to fetch dashboard stats:', error);
      // Return empty stats on error to prevent UI from breaking
      return { success: false, error: { message: 'Failed to fetch dashboard stats' } };
    }
  },
};

export default dashboardService;
