// src/services/financials.service.ts
/**
 * @file This file centralizes all logic for fetching and processing financial data.
 * It will be replaced by a single RPC call to Supabase in the future.
 */

import { allocationService as fundAllocationService } from './allocations.service';
import { reportService } from './report.service';
import { transactionService } from './transactionService';
import { applyDateFilter, type DateFilterValue } from '@/components/shared/DateRangeFilter';
import type { 
  Financials, 
  FundAllocation, 
  Report, 
  ReportWithDetails, 
  ServiceResponse, 
  FinancialTransaction, 
  UserContext 
} from '@/lib/types';

export const getFinancialStats = async (
  userContext: UserContext,
  dateFilter?: DateFilterValue
): Promise<ServiceResponse<Financials>> => {
    try {
      const { user, role } = userContext;
      if (!user || !role) {
        return { success: false, error: { message: 'User context is incomplete' } };
      }

      const roleFilters = {
        siteId: role === 'site_coordinator' ? user.siteId : undefined,
        smallGroupId: role === 'small_group_leader' ? user.smallGroupId : undefined,
      };

      const transactionFilters = { user, dateFilter };

      const [allocationsResponse, reportsResponse, transactionsResponse] = await Promise.all([
        fundAllocationService.getAllocations(), // Fetches all, will be filtered locally
        reportService.getReportsWithDetails({ ...roleFilters, dateRange: dateFilter }),
        transactionService.getFilteredTransactions(transactionFilters),
      ]);

      if (!allocationsResponse.success || !reportsResponse.success || !transactionsResponse.success) {
        const errorDetails = {
          allocationsError: allocationsResponse.error,
          reportsError: reportsResponse.error,
          transactionsError: transactionsResponse.error,
        };
        console.error('Financial data retrieval failed. Details:', JSON.stringify(errorDetails, null, 2));
        return {
          success: false,
          error: { message: 'Failed to retrieve one or more financial details.' },
          details: errorDetails,
        };
      }

      let allAllocations = allocationsResponse.data || [];
      let reports: ReportWithDetails[] = reportsResponse.data || [];
      let transactions: FinancialTransaction[] = transactionsResponse.data || [];

      if (dateFilter) {
        allAllocations = applyDateFilter(allAllocations, 'allocationDate', dateFilter);
      }

      const allocations = allAllocations.filter((alloc: FundAllocation) => {
        if (role === 'national_coordinator') return true;
        if (role === 'site_coordinator') return alloc.siteId === user.siteId;
        if (role === 'small_group_leader') return alloc.smallGroupId === user.smallGroupId;
        return false;
      });

      // Perform calculations
      const totalRevenue = transactions
        .filter(t => t.type === 'income')
        .reduce((sum: number, t: FinancialTransaction) => sum + t.amount, 0);

      const totalExpensesFromTransactions = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum: number, t: FinancialTransaction) => sum + t.amount, 0);

      const totalExpensesFromReports = reports.reduce((sum: number, report: Report) => sum + (report.totalExpenses || 0), 0);

      const totalExpenses = totalExpensesFromTransactions + totalExpensesFromReports;

      const totalAllocated = allocations.reduce((sum: number, alloc: FundAllocation) => sum + alloc.amount, 0);

      const netBalance = totalRevenue - totalExpenses;

      // Construct the final object according to the Financials type
      const financials: Financials = {
        totalRevenue,
        totalExpenses,
        totalAllocated,
        netBalance,
        allocations,
        reports: reports as Report[], // Cast is acceptable here
        transactions,
      };

      return { success: true, data: financials };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return { success: false, error: { message: `Could not calculate financials: ${errorMessage}` } };
    }
};
