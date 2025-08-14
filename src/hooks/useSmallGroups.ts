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
    queryFn: () => {
      if (!currentUser) throw new Error('User not authenticated');
      return smallGroupService.getFilteredSmallGroups({ user: currentUser, search: searchTerm });
    },
    enabled: !!currentUser, // Only run the query if the user is loaded
  });

    const createSmallGroupMutation = useMutation<
    SmallGroup,
    Error,
    { siteId: string; formData: SmallGroupFormData }
  >({
    mutationFn: async ({ siteId, formData }) => {
      const response = await fetch('/api/small-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, siteId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create small group');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      console.error('Failed to create small group:', error.message);
      throw error;
    },
  });

    const updateSmallGroupMutation = useMutation<
    SmallGroup,
    Error,
    { groupId: string; formData: Partial<SmallGroupFormData> }
  >({
    mutationFn: async ({ groupId, formData }) => {
      const response = await fetch(`/api/small-groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update small group');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      console.error('Failed to update small group:', error.message);
      throw error;
    },
  });

    const deleteSmallGroupMutation = useMutation<void, Error, string>({
    mutationFn: async (groupId: string) => {
      const response = await fetch(`/api/small-groups/${groupId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete small group');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      console.error('Failed to delete small group:', error.message);
      throw error;
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
