// src/services/financialsService.ts
'use client';

import { allocationService } from './allocations.service';
import { transactionService } from './transactionService';
import reportService from './reportService';
import type {
  User,
  Financials,
  ServiceResponse,
  FinancialTransaction,
  Report,
  FundAllocation,
} from '@/lib/types';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';
import { ROLES } from '@/lib/constants';

const financialsService = {
  async getDashboardData(user: User, dateFilter: DateFilterValue): Promise<ServiceResponse<Financials>> {
    if (!user) {
      return { success: false, error: { message: 'User not authenticated' } };
    }

    try {
      const allocationFilters: { siteId?: string; smallGroupId?: string } = {};
      if (user.role === ROLES.SITE_COORDINATOR && user.siteId) {
        allocationFilters.siteId = user.siteId;
      }
      if (user.role === ROLES.SMALL_GROUP_LEADER && user.smallGroupId) {
        allocationFilters.smallGroupId = user.smallGroupId;
      }

      const [allocationsRes, reportsRes, transactionsRes] = await Promise.all([
        allocationService.getAllocations(allocationFilters),
        reportService.getFilteredReports({ user, statusFilter: { submitted: false, approved: true, pending: false, rejected: false }, dateFilter }),
        transactionService.getFilteredTransactions({ user, dateFilter }),
      ]);

      if (!allocationsRes.success || !reportsRes.success || !transactionsRes.success) {
        return { success: false, error: { message: 'Failed to retrieve one or more financial details.' } };
      }

      const transactions = transactionsRes.data || [];
      const reports = reportsRes.data || [];
      const allocations = allocationsRes.data || [];

      const totalRevenue = transactions
        .filter((t: FinancialTransaction) => t.type === 'income')
        .reduce((sum: number, t: FinancialTransaction) => sum + t.amount, 0);

      const totalExpensesFromTransactions = transactions
        .filter((t: FinancialTransaction) => t.type === 'expense')
        .reduce((sum: number, t: FinancialTransaction) => sum + t.amount, 0);

      const totalExpensesFromReports = reports.reduce((sum: number, r: Report) => sum + (r.totalExpenses || 0), 0);

      const totalExpenses = totalExpensesFromTransactions + totalExpensesFromReports;

      const totalAllocated = allocations.reduce((sum: number, a: FundAllocation) => sum + a.amount, 0);

      const netBalance = totalRevenue - totalExpenses;

      const dashboardData: Financials = {
        totalRevenue,
        totalExpenses,
        totalAllocated,
        netBalance,
        allocations,
        reports,
        transactions: transactions.slice(0, 10),
      };

      return { success: true, data: dashboardData };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      return { success: false, error: { message } };
    }
  },

  async getEntityFinancials(
    entity: { type: 'site' | 'smallGroup'; id: string },
    dateFilter: DateFilterValue
  ): Promise<ServiceResponse<Financials>> {
    try {
      const allocationFilters: { siteId?: string; smallGroupId?: string } = {};
      if (entity.type === 'site') {
        allocationFilters.siteId = entity.id;
      } else {
        allocationFilters.smallGroupId = entity.id;
      }

      const [allocationsRes, reportsRes, transactionsRes] = await Promise.all([
        allocationService.getAllocations(allocationFilters),
        reportService.getFilteredReports({ entity, statusFilter: { submitted: false, approved: true, pending: false, rejected: false }, dateFilter }),
        transactionService.getFilteredTransactions({ entity, dateFilter }),
      ]);

      if (!allocationsRes.success || !reportsRes.success || !transactionsRes.success) {
        return { success: false, error: { message: 'Failed to retrieve one or more financial details.' } };
      }

      const transactions = transactionsRes.data || [];
      const reports = reportsRes.data || [];
      const allocations = allocationsRes.data || [];

      const totalRevenue = transactions
        .filter((t: FinancialTransaction) => t.type === 'income')
        .reduce((sum: number, t: FinancialTransaction) => sum + t.amount, 0);

      const totalExpensesFromTransactions = transactions
        .filter((t: FinancialTransaction) => t.type === 'expense')
        .reduce((sum: number, t: FinancialTransaction) => sum + t.amount, 0);

      const totalExpensesFromReports = reports.reduce((sum: number, r: Report) => sum + (r.totalExpenses || 0), 0);

      const totalExpenses = totalExpensesFromTransactions + totalExpensesFromReports;

      const totalAllocated = allocations.reduce((sum: number, a: FundAllocation) => sum + a.amount, 0);

      const netBalance = totalRevenue - totalExpenses;

      const dashboardData: Financials = {
        totalRevenue,
        totalExpenses,
        totalAllocated,
        netBalance,
        allocations,
        reports,
        transactions: transactions.slice(0, 10),
      };

      return { success: true, data: dashboardData };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      return { success: false, error: { message } };
    }
  },
};

export default financialsService;
