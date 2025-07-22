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
  const roleBasedFilter = {
    siteId: user.role === ROLES.SITE_COORDINATOR ? user.siteId : undefined,
    smallGroupId: user.role === ROLES.SMALL_GROUP_LEADER ? user.smallGroupId : undefined,
  };

  const transactionFilters: TransactionFilters = {
    user: user,
    dateFilter: dateFilter
  };

  try {
    // Note: Transactions are filtered by date in the service, others are filtered here.
    const [transactionsRes, allocationsRes, reportsRes] = await Promise.all([
      transactionService.getFilteredTransactions(transactionFilters),
      allocationService.getAllocations(roleBasedFilter),
      reportService.getFilteredReports({ user }),
    ]);

    if (!transactionsRes.success || !allocationsRes.success || !reportsRes.success) {
      console.error('Failed to fetch one or more financial resources:', {
        transactionsError: transactionsRes.error,
        allocationsError: allocationsRes.error,
        reportsError: reportsRes.error,
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
    console.error('Error in getFinancials:', error);
    return { success: false, error: { message: error.message || 'An unexpected error occurred.' } };
  }
};

const financialsService = {
  getFinancials,
};

export { financialsService };
