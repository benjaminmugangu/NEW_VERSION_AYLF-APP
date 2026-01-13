// src/hooks/useSmallGroupDetails.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import * as smallGroupService from '@/services/smallGroupService';
import * as siteService from '@/services/siteService';
import * as profileService from '@/services/profileService';
import * as memberService from '@/services/memberService';
import { SmallGroup, Site, User, MemberWithDetails, SmallGroupFormData } from '@/lib/types';
import { useCurrentUser } from '@/contexts/AuthContext';
import { getClientErrorMessage } from '@/lib/clientErrorHandler';

export interface SmallGroupDetails extends SmallGroup {
  site?: Site;
  leader?: User;
  logisticsAssistant?: User;
  financeAssistant?: User;
  members: MemberWithDetails[];
}

export const useSmallGroupDetails = (groupId: string | null) => {
  const { currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const fetchDetails = async () => {
    if (!groupId || !currentUser) return null;

    const groupResult = await smallGroupService.getSmallGroupById(groupId);
    if (!groupResult.success || !groupResult.data) {
      throw new Error(groupResult.error?.message || 'Failed to fetch small group');
    }
    const baseGroup = groupResult.data;

    const userIds = [
      baseGroup.leaderId,
      baseGroup.logisticsAssistantId,
      baseGroup.financeAssistantId,
    ].filter((id): id is string => !!id);

    const [siteResult, usersResult, membersResult] = await Promise.all([
      baseGroup.siteId ? siteService.getSiteById(baseGroup.siteId) : Promise.resolve({ success: true, data: undefined }),
      profileService.getUsersByIds(userIds),
      memberService.getFilteredMembers({ user: currentUser, smallGroupId: groupId, searchTerm: '' }),
    ]);

    const users = usersResult.success && usersResult.data ? usersResult.data : [];
    const site = siteResult.success ? siteResult.data : undefined;
    const groupMembers = membersResult.success && membersResult.data ? membersResult.data : [];

    const usersMap = new Map(users.map((u: User) => [u.id, u]));

    return {
      ...baseGroup,
      site,
      leader: baseGroup.leaderId ? usersMap.get(baseGroup.leaderId) : undefined,
      logisticsAssistant: baseGroup.logisticsAssistantId ? usersMap.get(baseGroup.logisticsAssistantId) : undefined,
      financeAssistant: baseGroup.financeAssistantId ? usersMap.get(baseGroup.financeAssistantId) : undefined,
      members: groupMembers as MemberWithDetails[],
    };
  };

  const {
    data: smallGroup,
    isLoading,
    error,
    refetch,
  } = useQuery<SmallGroupDetails | null, Error>({
    queryKey: ['smallGroupDetails', groupId, currentUser?.id],
    queryFn: fetchDetails,
    enabled: !!groupId && !!currentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const mutationOptions = {
    onSuccess: () => {
      toast({ title: 'Success', description: 'Operation completed successfully.' });
      // Invalidate the details query to refetch the latest data
      queryClient.invalidateQueries({ queryKey: ['smallGroupDetails', groupId] });
      // Also invalidate the list of all small groups as it might have changed
      queryClient.invalidateQueries({ queryKey: ['smallGroups'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: getClientErrorMessage(error), variant: 'destructive' });
    },
  };

  const { mutateAsync: updateSmallGroup, isPending: isUpdating } = useMutation({
    ...mutationOptions,
    mutationFn: (data: SmallGroupFormData) => {
      if (!groupId) throw new Error('Group ID is missing');
      return smallGroupService.updateSmallGroup(groupId, data);
    },
  });

  const { mutateAsync: deleteSmallGroup, isPending: isDeleting } = useMutation({
    ...mutationOptions,
    mutationFn: () => {
      if (!groupId) throw new Error('Group ID is missing');
      return smallGroupService.deleteSmallGroup(groupId);
    },
  });


  return {
    smallGroup,
    isLoading,
    error,
    refetch,
    updateSmallGroup,
    isUpdating,
    deleteSmallGroup,
    isDeleting,
  };
};
