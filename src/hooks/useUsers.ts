// src/hooks/useUsers.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { profileService } from '@/services/profileService';

import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/lib/types';



export const useUsers = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    setError(null);
    const usersRes = await profileService.getUsers();

    if (usersRes.success) {
      setUsers(usersRes.data || []);
    } else {
      const errorMessage = usersRes.error?.message || 'Failed to fetch user data.';
      setError(errorMessage);
      setUsers([]);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [fetchData, currentUser]);

  const refetch = () => fetchData();

  const deleteUser = async (userId: string) => {
        const response = await profileService.deleteUser(userId);
    if (response.success) {
      // Refetch data to ensure consistency after update
      fetchData();
      return { success: true };
    } else {
      const errorMessage = response.error?.message || 'An unknown error occurred during deletion.';
      setError(errorMessage);
      return { success: false, error: { message: errorMessage } };
    }
  };

  return { users, isLoading, error, refetch, deleteUser };
};


