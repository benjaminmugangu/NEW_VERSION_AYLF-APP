// src/hooks/useFinancials.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import financialsService from '@/services/financialsService';
import type { Financials } from '@/lib/types';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';

const defaultFinancials: Financials = {
  totalRevenue: 0,
  totalExpenses: 0,
  totalAllocated: 0,
  netBalance: 0,
  allocations: [],
  reports: [],
  transactions: [],
};

const defaultDateFilter: DateFilterValue = {
  rangeKey: 'this_year',
  display: 'This Year (Current)',
};

export const useFinancials = (initialDateFilter?: DateFilterValue) => {
  const { currentUser: user } = useAuth();

  const [financials, setFinancials] = useState<Financials>(defaultFinancials);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(initialDateFilter || defaultDateFilter);

  const fetchFinancials = useCallback(async (filter: DateFilterValue) => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const response = await financialsService.getDashboardData(user, filter);

    if (response.success && response.data) {
      setFinancials(response.data);
    } else {
      setError(response.error?.message || 'An unknown error occurred while fetching financial data.');
      setFinancials(defaultFinancials);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFinancials(dateFilter);
  }, [fetchFinancials, dateFilter]);

  return {
    stats: financials,
    isLoading,
    error,
    refetch: () => fetchFinancials(dateFilter),
    dateFilter,
    setDateFilter,
    currentUser: user,
  };
};