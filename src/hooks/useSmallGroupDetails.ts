// src/hooks/useSmallGroupDetails.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { smallGroupService } from '@/services/smallGroupService';
import siteService from '@/services/siteService';
import { profileService } from '@/services/profileService';
import { memberService } from '@/services/memberService';
import { SmallGroup, Site, User, MemberWithDetails, SmallGroupFormData } from '@/lib/types';
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const fetchDetails = async () => {
    if (!groupId || !currentUser) return null;

    const baseGroup = await smallGroupService.getSmallGroupById(groupId);

    const userIds = [
      baseGroup.leaderId,
      baseGroup.logisticsAssistantId,
      baseGroup.financeAssistantId,
    ].filter((id): id is string => !!id);

    const [site, usersResponse, membersResponse] = await Promise.all([
      baseGroup.siteId ? siteService.getSiteById(baseGroup.siteId) : Promise.resolve(undefined),
      profileService.getUsersByIds(userIds),
      memberService.getFilteredMembers({ user: currentUser, smallGroupId: groupId, searchTerm: '' }),
    ]);

    const usersMap = (usersResponse.success && usersResponse.data)
      ? new Map(usersResponse.data.map((u: User) => [u.id, u]))
      : new Map();

    const groupMembers = membersResponse || [];

    return {
      ...baseGroup,
      site,
      leader: baseGroup.leaderId ? usersMap.get(baseGroup.leaderId) : undefined,
      logisticsAssistant: baseGroup.logisticsAssistantId ? usersMap.get(baseGroup.logisticsAssistantId) : undefined,
      financeAssistant: baseGroup.financeAssistantId ? usersMap.get(baseGroup.financeAssistantId) : undefined,
      members: groupMembers,
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
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
