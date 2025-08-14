// src/hooks/useCertificates.ts
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { certificateService } from '@/services/certificateService';
import { getDateRangeFromFilterValue, type DateFilterValue } from '@/components/shared/DateRangeFilter';

const ALL_TIME_FILTER: DateFilterValue = { rangeKey: 'all_time', display: 'All Time' };

export const useCertificates = () => {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(ALL_TIME_FILTER);

  const { 
    data: roster,
    isLoading,
    isError,
    error,
    refetch 
  } = useQuery({
    queryKey: ['certificateRoster', dateFilter],
    queryFn: () => {
      const { startDate, endDate } = getDateRangeFromFilterValue(dateFilter);
      // The service now throws an error, which react-query will handle automatically.
      return certificateService.getCertificateRoster({ 
        startDate: startDate ?? null,
        endDate: endDate ?? null,
      });
    },
    placeholderData: (previousData) => previousData, // Show previous data while fetching new data
  });

  return {
    roster: roster ?? [],
    isLoading,
    isError,
    error: error instanceof Error ? error.message : null,
    dateFilter,
    setDateFilter,
    refetch,
  };
};
