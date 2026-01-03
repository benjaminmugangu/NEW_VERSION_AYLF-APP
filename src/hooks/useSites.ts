import { useQuery } from '@tanstack/react-query';
import * as siteService from '@/services/siteService';
import { useCurrentUser } from '@/contexts/AuthContext';

export const useSites = () => {
  const { currentUser } = useCurrentUser();

  const { data: allSites = [], isLoading, isError, error } = useQuery({
    queryKey: ['sites', currentUser?.id],
    queryFn: () => siteService.getSitesWithDetails(currentUser),
    enabled: !!currentUser, // Only run the query if the user is authenticated
  });

  return { allSites, isLoading, isError, error };
};
