// src/services/financialsService.ts
'use client';

import { allocationService } from './allocations.service';
import { transactionService, type TransactionFilters } from './transactionService';
import { reportService } from './reportService';
import type {
  User,
  Financials,
  ServiceResponse,
  FinancialTransaction,
  FundAllocation,
  Report
} from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { applyDateFilter, type DateFilterValue } from '@/components/shared/DateRangeFilter';

/**
 * A centralized function to fetch and calculate financial statistics based on user context and date filters.
 */
const getFinancials = async (user: User, dateFilter: DateFilterValue): Promise<ServiceResponse<Financials>> => {
  try {
    // 1. Define filters based on user role
    const transactionFilters: TransactionFilters = { user, dateFilter };
    const reportFilters = { user, dateFilter };
    let allocationFilters: { siteId?: string; smallGroupId?: string } = {};

    switch (user.role) {
      case ROLES.SITE_COORDINATOR:
        allocationFilters = { siteId: user.siteId ?? undefined };
        break;
      case ROLES.SMALL_GROUP_LEADER:
        allocationFilters = { smallGroupId: user.smallGroupId ?? undefined };
        break;
      // NATIONAL_COORDINATOR sees all, so no specific filter needed
    }

    // 2. Fetch all data concurrently with the correct filters
    const [transactionsRes, allocationsRes, reportsRes] = await Promise.all([
      transactionService.getFilteredTransactions(transactionFilters),
      allocationService.getAllocations(allocationFilters),
      reportService.getFilteredReports(reportFilters),
    ]);

    if (!transactionsRes.success || !allocationsRes.success || !reportsRes.success) {
      console.error('[FinancialsService] Failed to fetch one or more financial resources:', {
        transactionsError: transactionsRes.error?.message,
        allocationsError: allocationsRes.error?.message,
        reportsError: reportsRes.error?.message,
      });
      return { success: false, error: { message: 'Could not fetch all financial data.' } };
    }

    // Filter allocations and reports by date locally
    const filteredAllocations = applyDateFilter(allocationsRes.data || [], 'allocationDate', dateFilter);
    const filteredReports = applyDateFilter(reportsRes.data || [], 'submissionDate', dateFilter);
    const transactions = transactionsRes.data || [];

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    const netBalance = income - expenses;

    const totalAllocated = filteredAllocations.reduce((acc, a) => acc + a.amount, 0);
    const totalSpent = filteredReports.reduce((acc, r) => acc + (r.totalExpenses || 0), 0);
    const allocationBalance = totalAllocated - totalSpent;

    const data: Financials = {
      income,
      expenses,
      netBalance,
      totalAllocated,
      totalSpent,
      allocationBalance,
      transactions: transactions,
      allocations: filteredAllocations,
      reports: filteredReports,
    };

    return { success: true, data };

  } catch (error: any) {
    console.error('[FinancialsService] Unexpected error in getFinancials:', error.message);
    return { success: false, error: { message: error.message || 'An unexpected error occurred.' } };
  }
};

const financialsService = {
  getFinancials,
};

export { financialsService };
