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
    queryFn: async () => {
      const { startDate, endDate } = getDateRangeFromFilterValue(dateFilter);
      const data = await certificateService.getCertificateRoster({ 
        startDate: startDate ?? null,
        endDate: endDate ?? null,
      });
      return data;
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
