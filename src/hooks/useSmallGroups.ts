// src/hooks/useSmallGroups.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { smallGroupService } from '@/services/smallGroupService';
import type { SmallGroup, User } from '@/lib/types';
import { useAuth } from './useAuth';
import { ROLES } from '@/lib/constants';

// The SmallGroup type from the service now includes enriched data like siteName, leaderName, and memberCount.
// We can use the SmallGroup type directly.
export type SmallGroupWithDetails = SmallGroup;

export const useSmallGroups = () => {
  const { currentUser } = useAuth();
  const [smallGroups, setSmallGroups] = useState<SmallGroupWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSmallGroups = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    setError(null);

    const response = await smallGroupService.getFilteredSmallGroups({ user: currentUser, search: searchTerm });

    if (response.success && response.data) {
      setSmallGroups(response.data);
    } else {
      setError(response.error?.message || 'Failed to fetch small groups.');
      setSmallGroups([]);
    }

    setIsLoading(false);
  }, [currentUser, searchTerm]);

  useEffect(() => {
    fetchSmallGroups();
  }, [fetchSmallGroups]);

  const deleteSmallGroup = async (groupId: string) => {
    const result = await smallGroupService.deleteSmallGroup(groupId);
    if (result.success) {
      setSmallGroups(prev => prev.filter(sg => sg.id !== groupId));
      return { success: true };
    }
    return { success: false, error: result.error };
  };

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
    error,
    refetch: fetchSmallGroups,
    deleteSmallGroup,
    searchTerm,
    setSearchTerm,
    canCreateSmallGroup,
    canEditOrDeleteSmallGroup,
  };
};
