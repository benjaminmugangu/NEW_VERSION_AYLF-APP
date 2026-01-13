import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import * as siteService from '@/services/siteService';
import * as smallGroupService from '@/services/smallGroupService';
import { useCurrentUser } from '@/contexts/AuthContext';
import { ROLES } from '@/lib/constants';
import { useMemo } from 'react';
import { SiteFormData } from '@/lib/types';
import { getClientErrorMessage } from '@/lib/clientErrorHandler';

const SITE_DETAILS_QUERY_KEY = 'siteDetails';

export const useSiteDetails = (siteId: string) => {
  const queryClient = useQueryClient();
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [SITE_DETAILS_QUERY_KEY, siteId],
    queryFn: async () => {
      const response = await siteService.getSiteDetails(siteId);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch site details');
      }
      return response.data;
    },
    enabled: !!siteId, // Only run if siteId is available
  });

  const deleteSmallGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await smallGroupService.deleteSmallGroup(groupId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete small group');
      }
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Small group deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: [SITE_DETAILS_QUERY_KEY, siteId] });
      queryClient.invalidateQueries({ queryKey: ['smallGroups'] }); // Invalidate the global list as well
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: `Failed to delete small group: ${getClientErrorMessage(error)}`, variant: 'destructive' });
    },
  });

  const updateSiteMutation = useMutation({
    mutationFn: async (data: Partial<SiteFormData>) => {
      const response = await siteService.updateSite(siteId, data);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update site');
      }
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Site updated successfully.' });
      queryClient.invalidateQueries({ queryKey: [SITE_DETAILS_QUERY_KEY, siteId] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: `Failed to update site: ${getClientErrorMessage(error)}`, variant: 'destructive' });
    },
  });

  const deleteSiteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await siteService.deleteSite(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete site');
      }
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Site deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['sites'] }); // Invalidate the main sites list
      queryClient.invalidateQueries({ queryKey: [SITE_DETAILS_QUERY_KEY, siteId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: `Failed to delete site: ${getClientErrorMessage(error)}`, variant: 'destructive' });
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
    isDeletingSmallGroup: deleteSmallGroupMutation.isPending,
    updateSite: updateSiteMutation.mutateAsync,
    isUpdatingSite: updateSiteMutation.isPending,
    deleteSite: deleteSiteMutation.mutateAsync,
    isDeletingSite: deleteSiteMutation.isPending,
    canManageSite,
  };
};
