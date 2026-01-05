// src/services/financialsService.ts

import * as allocationService from './allocations.service';
import * as transactionService from './transactionService';
import type { TransactionFilters } from './transactionService';
import * as reportService from './reportService';
import type {
  User,
  Financials,
  FundAllocation,
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

    const stats = calculateFinancialStats({
      role: user.role,
      siteId: user.siteId || undefined,
      smallGroupId: user.smallGroupId || undefined,
      transactions,
      allocations: filteredAllocations,
      reports: filteredReports
    });

    return {
      ...stats,
      transactions: transactions || [],
      allocations: filteredAllocations,
      reports: filteredReports,
    };

  } catch (error) {
    console.error('Error fetching financials:', error);
    throw new Error('Failed to load financial data. Please try again.');
  }
};

/**
 * Helper to calculate statistics consistently across all financial services
 */
function calculateFinancialStats(params: {
  role: string;
  siteId?: string;
  smallGroupId?: string;
  transactions: any[];
  allocations: any[];
  reports: any[];
}) {
  const { role, siteId, smallGroupId, transactions, allocations, reports } = params;

  // 1. Calculate DIRECT INCOME & EXPENSES
  const directIncome = transactions
    .filter(t => t.type === 'income' && t.status === 'approved')
    .reduce((acc, t) => acc + t.amount, 0);

  const expenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'approved')
    .reduce((acc, t) => acc + t.amount, 0);

  // 2. Calculate RECEIVED Allocations (Income for Sites/Groups)
  const receivedAllocationsTotal = allocations
    .filter(a => {
      if (role === ROLES.SITE_COORDINATOR || (siteId && !smallGroupId)) {
        // Target is Site: Income for the SC WALLET is only what comes to the site WITHOUT a smallGroupId
        return a.siteId === siteId && a.fromSiteId !== siteId && !a.smallGroupId;
      }
      if (role === ROLES.SMALL_GROUP_LEADER || smallGroupId) {
        // Target is SGL: Income is what's allocated specifically to their group
        return a.smallGroupId === smallGroupId;
      }
      return false; // National creates income, doesn't receive it from levels
    })
    .reduce((acc, a) => acc + a.amount, 0);

  // 2b. Calculate DIRECT GROUP INJECTIONS (For Site Territory visibility)
  // These are funds sent by NC directly to a group in this site, bypassing SC wallet
  const directGroupInjections = (siteId && !smallGroupId)
    ? allocations
      .filter(a => a.siteId === siteId && a.smallGroupId && (a.fromSiteId === null || a.fromSiteId === undefined))
      .reduce((acc, a) => acc + a.amount, 0)
    : 0;

  const income = directIncome + receivedAllocationsTotal;

  // 3. Calculate OUTGOING Allocations (Reallocated)
  const outgoingAllocations = allocations
    .filter(a => {
      if (role === ROLES.NATIONAL_COORDINATOR && !siteId && !smallGroupId) {
        // National context: Funds sent from National (fromSiteId is null)
        return a.fromSiteId === null || a.fromSiteId === undefined;
      }
      if (siteId && !smallGroupId) {
        // Site context: Funds sent from this Site to Groups
        return a.fromSiteId === siteId;
      }
      return false; // Small groups don't reallocate
    })
    .reduce((acc, a) => acc + a.amount, 0);

  const totalAllocated = outgoingAllocations;
  const totalSpentInReports = reports.reduce((acc, r) => acc + (r.totalExpenses || 0), 0);

  // Balance Logic: What is left to spend
  const netBalance = income - (expenses + totalAllocated);

  // Allocation Reconciliation (For internal tracking)
  const allocationBalance = totalAllocated - totalSpentInReports;

  return {
    income,
    expenses,
    netBalance,
    totalAllocated,
    totalSpent: totalSpentInReports,
    allocationBalance,
    directGroupInjections, // New field for site territory visibility
  };
}

/**
 * Fetches financial statistics for a specific entity (Site or Small Group) directly.
 * Used by Site/Group dashboards where the viewer might be a National admin viewing a specific entity.
 */
export const getEntityFinancials = async (
  entity: { type: 'site' | 'smallGroup'; id: string },
  dateFilter: DateFilterValue
): Promise<Financials> => {
  try {
    const transactionFilters: TransactionFilters = {
      dateFilter,
      entity,
    };

    // NOTE: Reports service typically requires user context for filtering.
    // For entity-level access, we rely on service-level filtering where possible.

    // Better approach: Call services with specific ID filters if they support it.
    // transactionService.getFilteredTransactions supports arbitrary filters.
    // allocationService.getAllocations supports arbitrary filters.
    // reportService.getFilteredReports - let's check this one.

    // For now, let's assume we can filter by ID.
    const allocationFilters = {
      siteId: entity.type === 'site' ? entity.id : undefined,
      smallGroupId: entity.type === 'smallGroup' ? entity.id : undefined
    };

    // Reports service usually takes a user to decide what to show. 
    // If we want "all reports for this site", we might need a specific service method or a "system" user context.
    // Let's rely on the services being smart enough or add specific queries.

    // REVISIT: reportService.getFilteredReports takes { user }. 
    // If we are a National Coord viewing a Site, we want THAT SITE's reports.
    // We should pass the actual current user (auditor) to this function? 
    // The hook in client doesn't pass the current user.

    // Let's implement a direct fetcher reusing what we can.

    const [transactions, allocations, reports] = await Promise.all([
      transactionService.getFilteredTransactions(transactionFilters),
      allocationService.getAllocations(allocationFilters),
      reportService.getFilteredReports({ entity }),
    ]);

    // Filter allocations and reports by date locally
    const filteredAllocations = applyDateFilter(allocations || [], 'allocationDate', dateFilter);
    const filteredReports = applyDateFilter(reports || [], 'submissionDate', dateFilter);

    const stats = calculateFinancialStats({
      role: 'VIEWER', // Role doesn't matter much here since we have explicit IDs
      siteId: entity.type === 'site' ? entity.id : undefined,
      smallGroupId: entity.type === 'smallGroup' ? entity.id : undefined,
      transactions,
      allocations: filteredAllocations,
      reports: filteredReports
    });

    return {
      ...stats,
      transactions: transactions || [],
      allocations: filteredAllocations,
      reports: filteredReports,
    };
  } catch (error) {
    console.error("Error fetching entity financials:", error);
    throw error;
  }
};
