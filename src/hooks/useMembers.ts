// src/hooks/useMembers.ts
'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/contexts/AuthContext';
import * as memberService from '@/services/memberService';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';
import { ROLES } from '@/lib/constants';
import type { Member, MemberWithDetails } from '@/lib/types';

export const useMembers = () => {
  const { currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const isNationalCoordinator = currentUser?.role === ROLES.NATIONAL_COORDINATOR;
  const isSiteCoordinator = currentUser?.role === ROLES.SITE_COORDINATOR;

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });
  const [typeFilter, setTypeFilter] = useState<Record<Member['type'], boolean>>({ student: true, "non-student": true });

  // UI filters for query keys
  const uiFilters = { searchTerm, dateFilter, typeFilter };

  // Service filters use raw DateFilterValue
  const serviceFilters = {
    user: currentUser!,
    searchTerm,
    dateFilter: dateFilter,
    typeFilter,
  };

  const {
    data: members,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['members', currentUser?.id, uiFilters],
    queryFn: async (): Promise<MemberWithDetails[]> => {
      if (!currentUser) return [];
      const response = await memberService.getFilteredMembers(serviceFilters);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch members');
      }
      return response.data;
    },
    enabled: !!currentUser, // Only run query if user is logged in
  });

  const { mutateAsync: deleteMember, isPending: isDeleting } = useMutation<void, Error, string>({
    mutationFn: async (memberId: string) => {
      const result = await memberService.deleteMember(memberId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete member');
      }
    },
    onSuccess: () => {
      // On success, invalidate the members query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['members', currentUser?.id, uiFilters] });
    },
    // onError is handled by the component calling deleteMember
  });

  return {
    members: members ?? [],
    isLoading,
    isDeleting,
    error: error instanceof Error ? error.message : null,
    filters: uiFilters,
    setSearchTerm,
    setDateFilter,
    setTypeFilter,
    refetch,
    deleteMember,
    canCreateMember: isNationalCoordinator || isSiteCoordinator,
    canEditOrDeleteMember: (member: MemberWithDetails) => {
      if (isNationalCoordinator) return true;
      if (isSiteCoordinator && currentUser?.siteId === member.siteId) return true;
      return false;
    },
  };
};
