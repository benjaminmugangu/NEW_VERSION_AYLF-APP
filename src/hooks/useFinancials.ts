// src/hooks/useFinancials.ts
"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
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
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(initialDateFilter || defaultDateFilter);

  const { 
    data: financials,
    isLoading,
    isError,
    error,
    refetch 
  } = useQuery<Financials, Error>({
    queryKey: ['financials', user?.id, dateFilter],
    queryFn: async () => {
      if (!user) {
        // This should not happen if `enabled` is set correctly, but as a safeguard:
        return defaultFinancials;
      }
      const response = await financialsService.getFinancials(user, dateFilter);
      if (response.success && response.data) {
        return response.data;
      }
      // Throw an error that react-query will catch
      throw new Error(response.error?.message || 'An unknown error occurred while fetching financial data.');
    },
    enabled: !!user, // Only run the query if the user is logged in
    placeholderData: defaultFinancials, // Provide default data while loading
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    stats: financials || defaultFinancials,
    isLoading,
    error: isError ? error.message : null,
    refetch,
    dateFilter,
    setDateFilter,
    currentUser: user,
  };
};