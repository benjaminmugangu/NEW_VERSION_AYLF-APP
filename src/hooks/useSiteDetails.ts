import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import siteService from '@/services/siteService';
import smallGroupService from '@/services/smallGroupService';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/lib/constants';
import { useMemo } from 'react';
import { SiteFormData } from '@/lib/types';

const SITE_DETAILS_QUERY_KEY = 'siteDetails';

export const useSiteDetails = (siteId: string) => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [SITE_DETAILS_QUERY_KEY, siteId],
    queryFn: () => siteService.getSiteDetails(siteId),
    enabled: !!siteId, // Only run if siteId is available
  });

  const deleteSmallGroupMutation = useMutation({
    mutationFn: (groupId: string) => smallGroupService.deleteSmallGroup(groupId),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Small group deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: [SITE_DETAILS_QUERY_KEY, siteId] });
      queryClient.invalidateQueries({ queryKey: ['smallGroups'] }); // Invalidate the global list as well
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: `Failed to delete small group: ${error.message}`, variant: 'destructive' });
    },
  });

  const updateSiteMutation = useMutation({
        mutationFn: (data: Partial<SiteFormData>) => siteService.updateSite(siteId, data),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Site updated successfully.' });
      queryClient.invalidateQueries({ queryKey: [SITE_DETAILS_QUERY_KEY, siteId] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: `Failed to update site: ${error.message}`, variant: 'destructive' });
    },
  });

  const deleteSiteMutation = useMutation({
    mutationFn: (id: string) => siteService.deleteSite(id),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Site deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['sites'] }); // Invalidate the main sites list
      queryClient.invalidateQueries({ queryKey: [SITE_DETAILS_QUERY_KEY, siteId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: `Failed to delete site: ${error.message}`, variant: 'destructive' });
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
