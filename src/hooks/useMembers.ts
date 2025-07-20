// src/hooks/useMembers.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { memberService } from '@/services/memberService';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';
import { ROLES } from '@/lib/constants';
import type { Member, MemberWithDetails } from '@/lib/types';

export const useMembers = () => {
  const { currentUser } = useAuth();
  const isNationalCoordinator = currentUser?.role === ROLES.NATIONAL_COORDINATOR;
  const isSiteCoordinator = currentUser?.role === ROLES.SITE_COORDINATOR;
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
      const errorMessage = response.error?.message || 'An unknown error occurred.';
      setError(errorMessage);
      setMembers([]);
    }
    setIsLoading(false);
  }, [currentUser, searchTerm, dateFilter, typeFilter]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const deleteMember = async (memberId: string) => {
    const response = await memberService.deleteMember(memberId);
    if (response.success) {
      fetchMembers(); // Refetch members after deletion
    } else {
      const errorMessage = response.error?.message || 'Failed to delete member.';
      setError(errorMessage);
    }
    return response;
  };

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
    deleteMember,
    canCreateMember: isNationalCoordinator || isSiteCoordinator,
    canEditOrDeleteMember: (member: MemberWithDetails) => {
      if (isNationalCoordinator) return true;
      if (isSiteCoordinator && currentUser?.siteId === member.siteId) return true;
      return false;
    },
  };
};
