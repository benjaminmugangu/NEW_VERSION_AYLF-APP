// src/hooks/useUsers.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { profileService } from '@/services/profileService';
import type { User } from '@/lib/types';

// Type for the user creation data, matching the API route's schema
import { type UserFormData } from "@/app/dashboard/users/components/UserForm";

export type UserCreationData = Omit<User, 'id' | 'createdAt'>;

// Key for caching user data
const USERS_QUERY_KEY = ['users'];

export const useUsers = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query to fetch all users
  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: async () => {
      const response = await profileService.getUsers();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch users');
      }
      return response.data || [];
    },
  });

  // Mutation to create a new user
  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
          ...userData,
          mandateStartDate: userData.mandateStartDate instanceof Date ? userData.mandateStartDate.toISOString() : undefined,
          mandateEndDate: userData.mandateEndDate instanceof Date ? userData.mandateEndDate.toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'User created successfully.' });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Mutation to update a user's profile
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      return profileService.updateProfile(userId, updates);
    },
    onSuccess: (data, variables) => {
      toast({ title: 'Success', description: 'User updated successfully.' });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['userDetails', variables.userId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Mutation to delete a user
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => {
      return profileService.deleteUser(userId);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'User deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    users,
    isLoading,
    isError,
    error,
    createUser: createUserMutation.mutateAsync,
    updateUser: updateUserMutation.mutateAsync,
    deleteUser: deleteUserMutation.mutateAsync,
    isCreatingUser: createUserMutation.isPending,
    isUpdatingUser: updateUserMutation.isPending,
    isDeletingUser: deleteUserMutation.isPending,
  };
};


