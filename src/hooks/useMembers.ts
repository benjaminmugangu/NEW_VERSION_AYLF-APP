// src/hooks/useMembers.ts
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import memberService from '@/services/memberService';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';
import { ROLES } from '@/lib/constants';
import type { Member, MemberWithDetails } from '@/lib/types';

export const useMembers = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const isNationalCoordinator = currentUser?.role === ROLES.NATIONAL_COORDINATOR;
  const isSiteCoordinator = currentUser?.role === ROLES.SITE_COORDINATOR;

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });
  const [typeFilter, setTypeFilter] = useState<Record<Member['type'], boolean>>({ student: true, "non-student": true });

  const filters = { searchTerm, dateFilter, typeFilter };

  const { 
    data: members,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['members', currentUser?.id, filters],
    queryFn: () => {
      if (!currentUser) return [];
      // The service now throws on error, and react-query will catch it automatically.
      return memberService.getFilteredMembers({ user: currentUser, ...filters });
    },
    enabled: !!currentUser, // Only run query if user is logged in
  });

  const { mutateAsync: deleteMember, isPending: isDeleting } = useMutation<void, Error, string> ({
    mutationFn: (memberId: string) => memberService.deleteMember(memberId),
    onSuccess: () => {
      // On success, invalidate the members query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['members', currentUser?.id, filters] });
    },
    // onError is handled by the component calling deleteMember
  });

  return {
    members: members ?? [],
    isLoading,
    isDeleting,
    error: error instanceof Error ? error.message : null,
    filters,
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
