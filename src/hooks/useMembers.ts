// src/hooks/useMembers.ts
'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import * as memberService from '@/services/memberService';
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

  // Adapt dateFilter to use Date instances expected by the service layer
  const serverDateFilter = useMemo(() => {
    if (!dateFilter) return undefined;
    const fromDate = (dateFilter as any).from ? new Date((dateFilter as any).from) : undefined;
    const toDate = (dateFilter as any).to ? new Date((dateFilter as any).to) : undefined;
    return {
      rangeKey: (dateFilter as any).rangeKey,
      from: fromDate,
      to: toDate,
    } as { rangeKey?: string; from?: Date; to?: Date };
  }, [dateFilter]);

  // UI filters keep DateFilterValue for components and query keys
  const uiFilters = { searchTerm, dateFilter, typeFilter };
  // Service filters use serverDateFilter typed with Date
  const serviceFilters = {
    user: currentUser!,
    searchTerm,
    dateFilter: serverDateFilter,
    typeFilter,
  } as const;

  const {
    data: members,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['members', currentUser?.id, uiFilters],
    queryFn: () => {
      if (!currentUser) return [];
      // The service now throws on error, and react-query will catch it automatically.
      return memberService.getFilteredMembers(serviceFilters);
    },
    enabled: !!currentUser, // Only run query if user is logged in
  });

  const { mutateAsync: deleteMember, isPending: isDeleting } = useMutation<void, Error, string>({
    mutationFn: (memberId: string) => memberService.deleteMember(memberId),
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
