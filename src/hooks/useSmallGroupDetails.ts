// src/hooks/useSmallGroupDetails.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import smallGroupService from '@/services/smallGroupService';
import siteService from '@/services/siteService';
import { profileService } from '@/services/profileService';
import { memberService } from '@/services/memberService';
import { SmallGroup, Site, User, MemberWithDetails } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

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
      const baseGroup = await smallGroupService.getSmallGroupById(groupId);

      const userIds = [
        baseGroup.leaderId,
        baseGroup.logisticsAssistantId,
        baseGroup.financeAssistantId,
      ].filter((id): id is string => !!id);

      const [site, users, members] = await Promise.all([
        baseGroup.siteId ? siteService.getSiteById(baseGroup.siteId) : Promise.resolve(undefined),
        profileService.getUsersByIds(userIds),
        memberService.getFilteredMembers({ user: currentUser, smallGroupId: groupId, searchTerm: '' }),
      ]);

      const usersMap = new Map((users || []).map((u: User) => [u.id, u]));
      
      const details: SmallGroupDetails = {
        ...baseGroup,
        site,
        leader: baseGroup.leaderId ? usersMap.get(baseGroup.leaderId) : undefined,
        logisticsAssistant: baseGroup.logisticsAssistantId ? usersMap.get(baseGroup.logisticsAssistantId) : undefined,
        financeAssistant: baseGroup.financeAssistantId ? usersMap.get(baseGroup.financeAssistantId) : undefined,
        members: members || [],
      };

      setSmallGroup(details);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred.';
      console.error('[useSmallGroupDetails] Error fetching details:', errorMsg);
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
