// src/hooks/useEntityFinancials.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import financialsService from '@/services/financialsService';
import type { Financials, ServiceResponse } from '@/lib/types';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';

interface FinancialOptions {
  dateFilter: DateFilterValue;
  entity: { type: 'site' | 'smallGroup'; id: string };
}

export const useEntityFinancials = (options: FinancialOptions) => {
  const [stats, setStats] = useState<Financials | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinancials = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await financialsService.getEntityFinancials(options.entity, options.dateFilter);

    if (response.success && response.data) {
      setStats(response.data);
    } else {
      setError(response.error?.message || 'An unknown error occurred while fetching financial data.');
      setStats(null);
    }
    setIsLoading(false);
  }, [options]);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchFinancials,
  };
};
