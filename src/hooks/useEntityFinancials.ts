// src/hooks/useEntityFinancials.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import financialsService from '@/services/financialsService';
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
    setIsLoading(true);
    setError(null);
    try {
      // FIXME: This hook is not fully implemented. The financialsService currently requires a `User` object
      // to determine scope, but this hook needs to fetch financials for a specific entity (site or small group).
      // The service layer must be adapted to support this functionality.
      // For now, we simulate a 'not implemented' state.
      throw new Error('Fetching financials for a specific entity is not yet implemented.');

      // Example of future implementation:
      // const data = await financialsService.getFinancialsForEntity(options.entity, options.dateFilter);
      // setStats(data);

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
      setStats(null);
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
