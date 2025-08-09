// src/hooks/useSmallGroups.ts
'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import smallGroupService from '@/services/smallGroupService';
import type { SmallGroup, SmallGroupFormData, User } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/lib/constants';

export type SmallGroupWithDetails = SmallGroup;

export const useSmallGroups = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const queryKey = useMemo(() => ['smallGroups', { userId: currentUser?.id, role: currentUser?.role, siteId: currentUser?.siteId, searchTerm }], [currentUser, searchTerm]);

  const { data: smallGroups = [], isLoading, isError, error, refetch } = useQuery<SmallGroup[], Error>({
    queryKey,
    queryFn: async () => {
      if (!currentUser) throw new Error('User not authenticated');
      const response = await smallGroupService.getFilteredSmallGroups({ user: currentUser, search: searchTerm });
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch small groups.');
    },
    enabled: !!currentUser, // Only run the query if the user is loaded
  });

  const createSmallGroupMutation = useMutation<
    any,
    Error,
    { siteId: string; formData: SmallGroupFormData }
  >({
    mutationFn: ({ siteId, formData }) =>
      smallGroupService.createSmallGroup(siteId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      throw new Error(`Failed to create small group: ${(error as Error).message}`);
    },
  });

  const updateSmallGroupMutation = useMutation<
    any,
    Error,
    { groupId: string; formData: SmallGroupFormData }
  >({
    mutationFn: ({ groupId, formData }) =>
      smallGroupService.updateSmallGroup(groupId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      throw new Error(`Failed to update small group: ${(error as Error).message}`);
    },
  });

  const deleteSmallGroupMutation = useMutation<any, Error, string>({
    mutationFn: (groupId: string) => smallGroupService.deleteSmallGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      throw new Error(`Failed to delete small group: ${(error as Error).message}`);
    },
  });

  const canCreateSmallGroup = useMemo(() => {
    if (!currentUser) return false;
    return [
      ROLES.NATIONAL_COORDINATOR,
      ROLES.SITE_COORDINATOR
    ].includes(currentUser.role);
  }, [currentUser]);

  const canEditOrDeleteSmallGroup = useCallback((group: SmallGroupWithDetails): boolean => {
    if (!currentUser) return false;
    switch (currentUser.role) {
      case ROLES.NATIONAL_COORDINATOR:
        return true;
      case ROLES.SITE_COORDINATOR:
        return group.siteId === currentUser.siteId;
      case ROLES.SMALL_GROUP_LEADER:
        return group.id === currentUser.smallGroupId;
      default:
        return false;
    }
  }, [currentUser]);

  return {
    smallGroups,
    isLoading,
    isError,
    error,
    refetch,
    searchTerm,
    setSearchTerm,
    createSmallGroup: createSmallGroupMutation.mutate,
    updateSmallGroup: updateSmallGroupMutation.mutate,
    deleteSmallGroup: deleteSmallGroupMutation.mutate,
    isCreating: createSmallGroupMutation.isPending,
    isUpdating: updateSmallGroupMutation.isPending,
    isDeleting: deleteSmallGroupMutation.isPending,
    canCreateSmallGroup,
    canEditOrDeleteSmallGroup,
  };
};
