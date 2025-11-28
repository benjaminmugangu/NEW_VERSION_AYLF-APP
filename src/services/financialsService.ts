// src/services/financialsService.ts

import * as allocationService from './allocations.service';
import * as transactionService from './transactionService';
import type { TransactionFilters } from './transactionService';
import * as reportService from './reportService';
import type {
  User,
  Financials,
} from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { applyDateFilter, type DateFilterValue } from '@/lib/dateUtils';

/**
 * A centralized function to fetch and calculate financial statistics based on user context and date filters.
 * NOTE: This is a 'use client' service that aggregates data from server actions
 */
export const getFinancials = async (user: User, dateFilter: DateFilterValue): Promise<Financials> => {
  try {
    // 1. Define filters based on user role
    const transactionFilters: TransactionFilters = { user, dateFilter };

    // For reports, don't pass dateFilter to avoid type mismatch - we filter client-side
    const reportFilters = { user };
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

    // 2. Fetch all data concurrently. Promise.all will reject if any of the services fail.
    const [transactions, allocations, reports] = await Promise.all([
      transactionService.getFilteredTransactions(transactionFilters),
      allocationService.getAllocations(allocationFilters),
      reportService.getFilteredReports(reportFilters),
    ]);

    // Filter allocations and reports by date locally using client-side applyDateFilter
    const filteredAllocations = applyDateFilter(allocations || [], 'allocationDate', dateFilter);
    const filteredReports = applyDateFilter(reports || [], 'submissionDate', dateFilter);

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
      transactions: transactions || [],
      allocations: filteredAllocations,
      reports: filteredReports,
    };

    return data;

  } catch (error: any) {
    console.error('[FinancialsService] Unexpected error in getFinancials:', error.message);
    throw new Error(error.message || 'An unexpected error occurred while fetching financials.');
  }
};
