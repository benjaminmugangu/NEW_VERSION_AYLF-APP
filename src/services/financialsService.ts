// src/services/financialsService.ts
'use server';

import * as allocationService from './allocations.service';
import * as transactionService from './transactionService';
import type { TransactionFilters } from './transactionService';
import * as reportService from './reportService';
import type {
  User,
  Financials,
  FundAllocation,
  ServiceResponse
} from '@/lib/types';
import { ErrorCode } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { type DateFilterValue } from '@/lib/dateUtils';

/**
 * A centralized server function to fetch and calculate financial statistics based on user context and date filters.
 */
export async function getFinancials(user: User, dateFilter: DateFilterValue): Promise<ServiceResponse<Financials>> {
  try {
    // 1. Define filters based on user role
    const transactionFilters: TransactionFilters = { user, dateFilter };

    const reportFilters = { user };
    let allocationFilters: { siteId?: string; smallGroupId?: string; limit?: number } = { limit: 55 };
    transactionFilters.limit = 55;

    switch (user.role) {
      case ROLES.SITE_COORDINATOR:
        allocationFilters.siteId = user.siteId ?? undefined;
        break;
      case ROLES.SMALL_GROUP_LEADER:
        allocationFilters.smallGroupId = user.smallGroupId ?? undefined;
        break;
    }

    const { startDate, endDate } = calculateDateRange(dateFilter);
    const aggregatePromise = import('./budgetService').then(mod => mod.calculateBudgetAggregates({
      role: user.role,
      siteId: user.siteId || undefined,
      smallGroupId: user.smallGroupId || undefined,
      dateFilter: { startDate, endDate }
    }));

    const [statsResult, transactionsRes, allocationsRes, reportsRes] = await Promise.all([
      aggregatePromise,
      transactionService.getFilteredTransactions(transactionFilters),
      allocationService.getAllocations(allocationFilters),
      reportService.getFilteredReports(reportFilters),
    ]);

    // Handle service responses
    if (!transactionsRes.success) throw new Error(transactionsRes.error?.message || 'Failed to fetch transactions');
    if (!allocationsRes.success) throw new Error(allocationsRes.error?.message || 'Failed to fetch allocations');
    if (!reportsRes.success) throw new Error(reportsRes.error?.message || 'Failed to fetch reports');

    const transactions = transactionsRes.data || [];
    const allocations = allocationsRes.data || [];
    const reports = reportsRes.data || [];
    const stats = statsResult; // calculateBudgetAggregates currently returns data directly, but we might want to standardize it too.

    // 3. Create unified activity feed
    const unifiedActivity = [
      ...transactions.map(t => ({
        ...t,
        activityType: 'transaction' as const,
        userName: t.recordedByName,
        userAvatarUrl: t.recordedByAvatarUrl
      })),
      ...allocations.map(a => ({
        id: a.id,
        date: a.allocationDate,
        description: a.goal,
        amount: a.amount,
        type: 'income' as const,
        category: 'Allocation',
        status: (a.status === 'completed' ? 'approved' : 'pending') as any,
        activityType: 'allocation' as const,
        siteName: a.siteName,
        smallGroupName: a.smallGroupName,
        fromSiteName: a.fromSiteName,
        userName: a.allocatedByName,
        userAvatarUrl: a.allocatedByAvatarUrl
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50);

    return {
      success: true,
      data: {
        ...stats,
        transactions,
        allocations,
        reports,
        recentActivity: unifiedActivity,
      }
    };

  } catch (error: any) {
    console.error('Error fetching financials:', error);
    return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
  }
}

/**
 * Helper to extract date range from filter
 */
function calculateDateRange(dateFilter: DateFilterValue): { startDate?: Date; endDate?: Date } {
  if (dateFilter.from || dateFilter.to) {
    return {
      startDate: dateFilter.from ? new Date(dateFilter.from) : undefined,
      endDate: dateFilter.to ? new Date(dateFilter.to) : undefined
    };
  }

  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const s = startOfDay(now);

  switch (dateFilter.rangeKey) {
    case 'today':
      return { startDate: s, endDate: new Date(new Date(s).setDate(s.getDate() + 1)) };
    case 'this_week':
      const diff = (s.getDay() + 6) % 7;
      const startWeek = new Date(s);
      startWeek.setDate(s.getDate() - diff);
      const endWeek = new Date(startWeek);
      endWeek.setDate(endWeek.getDate() + 7);
      return { startDate: startWeek, endDate: endWeek };
    case 'this_month':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 1)
      };
    case 'this_year':
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear() + 1, 0, 1)
      };
    case 'last_30_days':
      return {
        startDate: new Date(new Date(s).setDate(s.getDate() - 30)),
        endDate: s
      };
    default:
      return {};
  }
}

/**
 * Fetches financial statistics for a specific entity (Site or Small Group) directly.
 */
export async function getEntityFinancials(
  entity: { type: 'site' | 'smallGroup'; id: string },
  dateFilter: DateFilterValue
): Promise<ServiceResponse<Financials>> {
  try {
    const transactionFilters: TransactionFilters = {
      dateFilter,
      entity,
    };

    const allocationFilters = {
      siteId: entity.type === 'site' ? entity.id : undefined,
      smallGroupId: entity.type === 'smallGroup' ? entity.id : undefined,
      limit: 55
    };
    transactionFilters.limit = 55;

    const { startDate, endDate } = calculateDateRange(dateFilter);
    const aggregatePromise = import('./budgetService').then(mod => mod.calculateBudgetAggregates({
      role: 'VIEWER',
      siteId: entity.type === 'site' ? entity.id : undefined,
      smallGroupId: entity.type === 'smallGroup' ? entity.id : undefined,
      dateFilter: { startDate, endDate }
    }));

    const [statsResult, transactionsRes, allocationsRes, reportsRes] = await Promise.all([
      aggregatePromise,
      transactionService.getFilteredTransactions(transactionFilters),
      allocationService.getAllocations(allocationFilters),
      reportService.getFilteredReports({ entity }),
    ]);

    // Handle service responses
    if (!transactionsRes.success) throw new Error(transactionsRes.error?.message || 'Failed to fetch transactions');
    if (!allocationsRes.success) throw new Error(allocationsRes.error?.message || 'Failed to fetch allocations');
    if (!reportsRes.success) throw new Error(reportsRes.error?.message || 'Failed to fetch reports');

    const transactions = transactionsRes.data || [];
    const allocations = allocationsRes.data || [];
    const reports = reportsRes.data || [];
    const stats = statsResult;

    // 3. Create unified activity feed
    const unifiedActivity = [
      ...transactions.map(t => ({
        ...t,
        activityType: 'transaction' as const,
        userName: t.recordedByName,
        userAvatarUrl: t.recordedByAvatarUrl
      })),
      ...allocations.map(a => ({
        id: a.id,
        date: a.allocationDate,
        description: a.goal,
        amount: a.amount,
        type: 'income' as const,
        category: 'Allocation',
        status: (a.status === 'completed' ? 'approved' : 'pending') as any,
        activityType: 'allocation' as const,
        siteName: a.siteName,
        smallGroupName: a.smallGroupName,
        fromSiteName: a.fromSiteName,
        userName: a.allocatedByName,
        userAvatarUrl: a.allocatedByAvatarUrl
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      success: true,
      data: {
        ...stats,
        transactions,
        allocations,
        reports,
        recentActivity: unifiedActivity,
      }
    };
  } catch (error: any) {
    console.error("Error fetching entity financials:", error);
    return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
  }
}
