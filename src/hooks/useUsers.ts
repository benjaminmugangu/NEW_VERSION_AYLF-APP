// src/hooks/useUsers.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { profileService } from '@/services/profileService';
import siteService from '@/services/siteService';
import smallGroupService from '@/services/smallGroupService';
import { useAuth } from '@/contexts/AuthContext';
import type { User, Site, SmallGroup } from '@/lib/types';

export interface UserWithDetails extends User {
  assignment: string;
}

export const useUsers = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    setError(null);
    const [usersRes, sitesRes, smallGroupsRes] = await Promise.all([
      profileService.getUsers(),
      siteService.getFilteredSites({ user: currentUser }),
      smallGroupService.getFilteredSmallGroups({ user: currentUser }),
    ]);

    if (usersRes.success && sitesRes.success && smallGroupsRes.success) {
      const sites = sitesRes.data || [];
      const smallGroups = smallGroupsRes.data || [];
      
      const usersWithDetails = (usersRes.data || []).map(user => ({
        ...user,
        assignment: getAssignment(user, sites, smallGroups),
      }));
      setUsers(usersWithDetails);
    } else {
      const errorDetails = usersRes.error || sitesRes.error || smallGroupsRes.error;
      const errorMessage = errorDetails?.message || 'Failed to fetch data.';
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
        // Note: Deleting a user profile might require special handling, e.g., deleting the auth user as well.
    // For now, we assume deleting the profile is what's intended.
    // This functionality might need to be moved to a more robust, backend-driven process.
        const response = await profileService.updateProfile(userId, { status: 'inactive' });
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

const getAssignment = (user: User, sites: Site[], smallGroups: SmallGroup[]): string => {
  if (user.role === 'site_coordinator' && user.siteId) {
    return sites.find(s => s.id === user.siteId)?.name || 'Unknown Site';
  }
  if (user.role === 'small_group_leader' && user.smallGroupId) {
    const sg = smallGroups.find(s => s.id === user.smallGroupId);
    if (sg) {
      const site = sites.find(s => s.id === sg.siteId);
      return `${sg.name} (${site?.name || 'Unknown Site'})`;
    }
    return 'Unknown Group';
  }
  return 'N/A';
};
