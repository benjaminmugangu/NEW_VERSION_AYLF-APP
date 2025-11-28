// src/hooks/useUser.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import * as profileService from '@/services/profileService';

const USER_DETAILS_QUERY_KEY = 'userDetails';

/**
 * Custom hook to fetch a single user's details.
 * @param {string} userId - The ID of the user to fetch.
 * @returns The user data, loading state, and error state.
 */
export const useUser = (userId: string) => {
  const {
    data: user,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: [USER_DETAILS_QUERY_KEY, userId],
    queryFn: () => profileService.getProfile(userId),
    enabled: !!userId, // The query will not run until a userId is provided
  });

  return {
    user,
    isLoading,
    isError,
    error,
  };
};
