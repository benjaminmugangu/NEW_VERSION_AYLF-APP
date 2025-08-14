// src/services/financialsService.ts
'use client';

import { allocationService } from './allocations.service';
import { transactionService, type TransactionFilters } from './transactionService';
import reportService from './reportService';
import type {
  User,
  Financials,

  FinancialTransaction,
  FundAllocation,
  Report
} from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { applyDateFilter, type DateFilterValue } from '@/components/shared/DateRangeFilter';

/**
 * A centralized function to fetch and calculate financial statistics based on user context and date filters.
 */
const getFinancials = async (user: User, dateFilter: DateFilterValue): Promise<Financials> => {
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
    const [transactions, allocations, reports] = await Promise.all([
      transactionService.getFilteredTransactions(transactionFilters),
      allocationService.getAllocations(allocationFilters),
      reportService.getFilteredReports(reportFilters),
    ]);

    // Filter allocations and reports by date locally
    const filteredAllocations = applyDateFilter(allocations, 'allocationDate', dateFilter);
    const filteredReports = applyDateFilter(reports, 'submissionDate', dateFilter);

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

    return {
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

  } catch (error: any) {
    console.error('[FinancialsService] Error in getFinancials:', error.message);
    throw new Error(error.message || 'An unexpected error occurred while fetching financial data.');
  }
};

const financialsService = {
  getFinancials,
};

export default financialsService;
