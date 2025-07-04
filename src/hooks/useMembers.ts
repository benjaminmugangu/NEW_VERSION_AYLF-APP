// src/hooks/useMembers.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import memberService, { type MemberWithDetails } from '@/services/memberService';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';
import type { Member } from '@/lib/types';

export const useMembers = () => {
  const { currentUser } = useAuth();
  const [members, setMembers] = useState<MemberWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });
  const [typeFilter, setTypeFilter] = useState<Record<Member['type'], boolean>>({ student: true, "non-student": true });

  const fetchMembers = useCallback(async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    
    const response = await memberService.getFilteredMembers({
      user: currentUser,
      searchTerm,
      dateFilter,
      typeFilter,
    });

    if (response.success && response.data) {
      setMembers(response.data);
    } else {
      setError(response.error || "An unknown error occurred.");
      setMembers([]);
    }
    setIsLoading(false);
  }, [currentUser, searchTerm, dateFilter, typeFilter]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    isLoading,
    error,
    filters: {
      searchTerm,
      dateFilter,
      typeFilter,
    },
    setSearchTerm,
    setDateFilter,
    setTypeFilter,
    refetch: fetchMembers,
  };
};
