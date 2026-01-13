// src/hooks/useFinancials.ts
"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { User } from '@/lib/types';
import * as financialsService from '@/services/financialsService';
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

export const useFinancials = (user: User | null, initialDateFilter?: DateFilterValue) => {
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
      if (!user) throw new Error("User not authenticated");
      const response = await financialsService.getFinancials(user, dateFilter);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch financials');
      }
      return response.data;
    },
    enabled: !!user, // Only run the query if the user is logged in
    placeholderData: defaultFinancials, // Provide default data while loading
    staleTime: 0, // Ensure dashboard always reflects recent changes
  });

  return {
    stats: financials || defaultFinancials,
    isLoading,
    error: isError ? error.message : null,
    refetch,
    dateFilter,
    setDateFilter,
  };
};
