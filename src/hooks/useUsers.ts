// src/hooks/useUsers.ts
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@/services/profileService';
import type { User } from '@/lib/types';
import { useToast } from './use-toast';

const USERS_QUERY_KEY = 'users';

export const useUsers = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users = [], isLoading, isError, error } = useQuery<User[], Error>({
    queryKey: [USERS_QUERY_KEY],
    queryFn: () => profileService.getUsers(),
  });

  const handleMutationError = (error: Error, defaultMessage: string) => {
    console.error(error);
    toast({
      title: 'Error',
      description: error.message || defaultMessage,
      variant: 'destructive',
    });
  };

  /**
   * Payload for inviting a user (matches /api/users/invite route expectations)
   */
  type InviteUserPayload = {
    email: string;
    name: string; // full name
    role: User['role'];
    siteId?: string | null;
    smallGroupId?: string | null;
  };

  const { mutateAsync: createUser, isPending: isCreatingUser } = useMutation({
    mutationFn: async (userData: InviteUserPayload) => {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to invite user.');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      toast({ title: 'Success', description: 'User invited successfully.' });
    },
    onError: (error) => handleMutationError(error, 'Failed to create user.'),
  });

  const { mutateAsync: updateUser, isPending: isUpdatingUser } = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      return profileService.updateProfile(userId, updates);
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['userDetails', userId] });
    },
    onError: (error) => handleMutationError(error, 'Failed to update user.'),
  });

  const { mutate: deleteUser, isPending: isDeletingUser } = useMutation({
    mutationFn: (userId: string) => profileService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      toast({ title: 'Success', description: 'User deleted successfully.' });
    },
    onError: (error) => handleMutationError(error, 'Failed to delete user.'),
  });

  return {
    users,
    isLoading,
    isError,
    error,
    createUser,
    isCreatingUser,
    updateUser,
    isUpdatingUser,
    deleteUser,
    isDeletingUser,
  };
};
