// src/hooks/useEntityFinancials.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import * as financialsService from '@/services/financialsService';
import type { Financials } from '@/lib/types';
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
    try {
      setIsLoading(true);
      const response = await financialsService.getEntityFinancials(options.entity, options.dateFilter);
      if (response.success && response.data) {
        setStats(response.data);
        setError(null);
      } else {
        setError(response.error?.message || 'Failed to load entity financials.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load entity financials.');
    } finally {
      setIsLoading(false);
    }
  }, [options.entity, options.dateFilter]);

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
