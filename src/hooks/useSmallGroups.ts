// src/hooks/useSmallGroups.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import smallGroupService from '@/services/smallGroupService';
import siteService from '@/services/siteService';
import userService from '@/services/userService';
import { mockMembers } from '@/lib/mockData'; // Using mock data directly for counts
import type { SmallGroup, Site, User } from '@/lib/types';

export interface SmallGroupWithDetails extends SmallGroup {
  siteName: string;
  leader?: User;
  memberCount: number;
}

export const useSmallGroups = () => {
  const [allSmallGroups, setAllSmallGroups] = useState<SmallGroupWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSmallGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [sgResponse, sitesResponse] = await Promise.all([
        smallGroupService.getAllSmallGroups(),
        siteService.getAllSites(),
      ]);

      if (!sgResponse.success || !sitesResponse.success) {
        throw new Error(sgResponse.error || sitesResponse.error || 'Failed to fetch initial data.');
      }

      const smallGroups = sgResponse.data;
      const sites = sitesResponse.data;
      const sitesMap = new Map(sites.map(s => [s.id, s.name]));

      const leaderIds = smallGroups
        .map(sg => sg.leaderId)
        .filter((id): id is string => !!id);

      const usersResponse = await userService.getUsersByIds(leaderIds);
      const leadersMap = usersResponse.success
        ? new Map(usersResponse.data.map(u => [u.id, u]))
        : new Map();

      const smallGroupsWithDetails = smallGroups.map(sg => ({
        ...sg,
        siteName: sitesMap.get(sg.siteId) || 'N/A',
        leader: sg.leaderId ? leadersMap.get(sg.leaderId) : undefined,
        memberCount: mockMembers.filter(m => m.smallGroupId === sg.id).length,
      }));

      setAllSmallGroups(smallGroupsWithDetails);
    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(error);
      setAllSmallGroups([]);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSmallGroups();
  }, [fetchSmallGroups]);

  const deleteSmallGroup = async (groupId: string) => {
    const result = await smallGroupService.deleteSmallGroup(groupId);
    if (result.success) {
      setAllSmallGroups(prev => prev.filter(sg => sg.id !== groupId));
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const filteredSmallGroups = useMemo(() => {
    if (!searchTerm) {
      return allSmallGroups;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allSmallGroups.filter(sg => {
      const leaderName = sg.leader?.name?.toLowerCase() || '';
      return (
        sg.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        sg.siteName.toLowerCase().includes(lowerCaseSearchTerm) ||
        leaderName.includes(lowerCaseSearchTerm)
      );
    });
  }, [allSmallGroups, searchTerm]);

  return {
    smallGroups: filteredSmallGroups,
    allSmallGroups,
    isLoading,
    error,
    refetch: fetchSmallGroups,
    deleteSmallGroup,
    searchTerm,
    setSearchTerm,
  };
};
