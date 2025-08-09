import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { siteService } from '@/services/siteService';
import smallGroupService from '@/services/smallGroupService';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/lib/constants';
import { useMemo } from 'react';

const SITE_DETAILS_QUERY_KEY = 'siteDetails';

export const useSiteDetails = (siteId: string) => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [SITE_DETAILS_QUERY_KEY, siteId],
    queryFn: () => siteService.getSiteDetails(siteId),
    enabled: !!siteId, // Only run if siteId is available
  });

  const deleteSmallGroupMutation = useMutation({
    mutationFn: (groupId: string) => smallGroupService.deleteSmallGroup(groupId),
    onSuccess: () => {
      // Invalidate the site details query to refetch the data
      queryClient.invalidateQueries({ queryKey: [SITE_DETAILS_QUERY_KEY, siteId] });
    },
  });

  const deleteSiteMutation = useMutation({
    mutationFn: (id: string) => siteService.deleteSite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] }); // Invalidate the main sites list
    },
  });

  const canManageSite = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === ROLES.NATIONAL_COORDINATOR) return true;
    if (currentUser.role === ROLES.SITE_COORDINATOR && currentUser.siteId === siteId) return true;
    return false;
  }, [currentUser, siteId]);

  return {
    site: data?.site,
    smallGroups: data?.smallGroups || [],
    totalMembers: data?.totalMembers || 0,
    isLoading,
    isError,
    error,
    deleteSmallGroup: deleteSmallGroupMutation.mutateAsync,
    deleteSite: deleteSiteMutation.mutateAsync,
    canManageSite,
  };
};
