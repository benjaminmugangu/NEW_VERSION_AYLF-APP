'use client';

import { useQuery } from '@tanstack/react-query';
import * as allocationService from '@/services/allocations.service';
import { useCurrentUser } from '@/contexts/AuthContext';

export const useAllocations = () => {
  const { currentUser: user } = useCurrentUser();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['allocations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Assuming getAllocations fetches all allocations relevant to the user's role and entity
      const allocations = await allocationService.getAllocations();
      return allocations;
    },
    enabled: !!user, // Only run the query if the user is loaded
  });

  return { allocations: data, isLoading, error, refetch };
};
