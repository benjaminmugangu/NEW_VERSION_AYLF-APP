'use client';

import { useQuery } from '@tanstack/react-query';
import { allocationService } from '@/services/allocations.service';
import { useAuth } from '@/contexts/AuthContext';

export const useAllocations = () => {
  const { currentUser: user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['allocations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Assuming getAllocations fetches all allocations relevant to the user's role and entity
      const response = await allocationService.getAllocations(); 
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch allocations');
    },
    enabled: !!user, // Only run the query if the user is loaded
  });

  return { allocations: data, isLoading, error, refetch };
};
