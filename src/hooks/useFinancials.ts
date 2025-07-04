// src/hooks/useFinancials.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { ROLES } from '@/lib/constants';
import { getFinancialStats, type FinancialStats, type FinancialsOptions } from '@/services/financials.service';

export type { FinancialStats };
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';

const ALL_TIME_FILTER: DateFilterValue = { rangeKey: 'all_time', display: 'All Time' };

export interface UseFinancialsOptions {
    entity?: {
        type: 'site' | 'smallGroup';
        id: string;
    };
}

export const useFinancials = (options: UseFinancialsOptions = {}) => {
  const { entity } = options;
  const { currentUser } = useAuth();

  const defaultStats: FinancialStats = {
    fundsReceived: 0,
    expensesDeclared: 0,
    fundsReallocated: 0,
    balance: 0,
    allocationsReceived: [],
    allocationsSent: [],
    relevantReports: [],
  };

  const [stats, setStats] = useState<FinancialStats>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(ALL_TIME_FILTER);

  const fetchStats = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    const getContext = (): { type: FinancialsOptions['context']['type'], id?: string } | null => {
      if (entity) return { type: entity.type, id: entity.id };

      switch (currentUser.role) {
        case ROLES.NATIONAL_COORDINATOR:
          return { type: ROLES.NATIONAL_COORDINATOR, id: undefined };
        case ROLES.SITE_COORDINATOR:
          return { type: 'site', id: currentUser.siteId };
        case ROLES.SMALL_GROUP_LEADER:
          return { type: 'smallGroup', id: currentUser.smallGroupId };
        default:
          return null;
      }
    };

    const context = getContext();

    if (!context) {
      setIsLoading(false);
      setStats(defaultStats);
      return;
    }

    setIsLoading(true);
    setError(null);

    const response = await getFinancialStats({
      dateFilter,
      context: { type: context.type, id: context.id },
    });

    if (response.success && response.data) {
      setStats(response.data);
    } else {
      setError(response.error || 'An unknown error occurred while fetching financial stats.');
      setStats(defaultStats);
    }
    setIsLoading(false);
  }, [currentUser, dateFilter, entity]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    currentUser,
    dateFilter,
    setDateFilter,
    refetch: fetchStats,
  };
};