// src/hooks/useCertificates.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { certificateService, type RosterMember } from '@/services/certificateService';
import type { ServiceResponse } from '@/lib/types';
import { getDateRangeFromFilterValue, type DateFilterValue } from '@/components/shared/DateRangeFilter';

const ALL_TIME_FILTER: DateFilterValue = { rangeKey: 'all_time', display: 'All Time' };

export const useCertificates = () => {
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(ALL_TIME_FILTER);

  const fetchRoster = useCallback(async (filter: DateFilterValue) => {
    setIsLoading(true);
    setError(null);

    const { startDate, endDate } = getDateRangeFromFilterValue(filter);

    const response: ServiceResponse<RosterMember[]> = await certificateService.getCertificateRoster({
      startDate: startDate ?? null,
      endDate: endDate ?? null,
    });

    if (response.success && response.data) {
      setRoster(response.data);
    } else {
      setError(response.error?.message || 'An unknown error occurred while fetching the roster.');
      setRoster([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchRoster(dateFilter);
  }, [dateFilter, fetchRoster]);

  const refetch = () => {
    fetchRoster(dateFilter);
  };

  return { roster, isLoading, error, dateFilter, setDateFilter, refetch };
};
