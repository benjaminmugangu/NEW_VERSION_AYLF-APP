// src/hooks/useSmallGroupDetails.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import smallGroupService from '@/services/smallGroupService';
import siteService from '@/services/siteService';
import userService from '@/services/userService';
import memberService from '@/services/memberService';
import { SmallGroup, Site, User, MemberWithDetails } from '@/lib/types';
import { useAuth } from './useAuth';

export interface SmallGroupDetails extends SmallGroup {
  site?: Site;
  leader?: User;
  logisticsAssistant?: User;
  financeAssistant?: User;
  members: MemberWithDetails[];
}

export const useSmallGroupDetails = (groupId: string | null) => {
  const { currentUser } = useAuth();
  const [smallGroup, setSmallGroup] = useState<SmallGroupDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!groupId || !currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sgResponse = await smallGroupService.getSmallGroupById(groupId);
      if (!sgResponse.success || !sgResponse.data) {
        throw new Error(sgResponse.error || 'Failed to fetch small group.');
      }
      const baseGroup = sgResponse.data;

      const userIds = [
        baseGroup.leaderId,
        baseGroup.logisticsAssistantId,
        baseGroup.financeAssistantId,
      ].filter((id): id is string => !!id);

      const [siteResponse, usersResponse, membersResponse] = await Promise.all([
        baseGroup.siteId ? siteService.getSiteById(baseGroup.siteId) : Promise.resolve({ success: true, data: undefined }),
        userService.getUsersByIds(userIds),
        memberService.getFilteredMembers({ user: currentUser, smallGroupId: groupId, searchTerm: '' }),
      ]);

      const usersMap = (usersResponse.success && usersResponse.data) 
        ? new Map(usersResponse.data.map(u => [u.id, u])) 
        : new Map();
      
      const groupMembers = (membersResponse.success && membersResponse.data) ? membersResponse.data : [];

      const details: SmallGroupDetails = {
        ...baseGroup,
        site: (siteResponse.success && siteResponse.data) ? siteResponse.data : undefined,
        leader: baseGroup.leaderId ? usersMap.get(baseGroup.leaderId) : undefined,
        logisticsAssistant: baseGroup.logisticsAssistantId ? usersMap.get(baseGroup.logisticsAssistantId) : undefined,
        financeAssistant: baseGroup.financeAssistantId ? usersMap.get(baseGroup.financeAssistantId) : undefined,
        members: groupMembers,
      };

      setSmallGroup(details);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, currentUser]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return { smallGroup, isLoading, error, refetch: fetchDetails };
};
