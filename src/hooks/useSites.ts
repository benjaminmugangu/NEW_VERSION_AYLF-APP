import { useQuery } from '@tanstack/react-query';
import * as siteService from '@/services/siteService';
import { useCurrentUser } from '@/contexts/AuthContext';

export const useSites = () => {
  const { currentUser } = useCurrentUser();

  const { data: allSites = [], isLoading, isError, error } = useQuery({
    queryKey: ['sites', currentUser?.id],
    queryFn: async (): Promise<any[]> => {
      const response = await siteService.getSitesWithDetails(currentUser);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch sites');
      }
      return response.data;
    },
    enabled: !!currentUser, // Only run the query if the user is authenticated
  });

  return { allSites, isLoading, isError, error };
};
