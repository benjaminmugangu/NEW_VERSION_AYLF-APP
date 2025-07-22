// src/hooks/useFinancials.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { financialsService } from '@/services/financialsService';
import type { Financials } from '@/lib/types';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';

const defaultFinancials: Financials = {
  income: 0,
  expenses: 0,
  netBalance: 0,
  totalAllocated: 0,
  totalSpent: 0,
  allocationBalance: 0,
  transactions: [],
  allocations: [],
  reports: [],
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

    const response = await financialsService.getFinancials(user, filter);

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