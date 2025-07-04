// src/hooks/useUsers.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import userService from '@/services/userService';
import siteService from '@/services/siteService';
import smallGroupService from '@/services/smallGroupService';
import type { User, Site, SmallGroup } from '@/lib/types';

export interface UserWithDetails extends User {
  assignment: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [usersRes, sitesRes, smallGroupsRes] = await Promise.all([
      userService.getAllUsers(),
      siteService.getAllSites(),
      smallGroupService.getSmallGroups(),
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
      const errorMessage = errorDetails ? errorDetails.message : 'Failed to fetch data.';
      setError(errorMessage);
      setUsers([]);
      console.error('Data fetching errors:', { usersRes, sitesRes, smallGroupsRes });
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = () => fetchData();

  const deleteUser = async (userId: string) => {
    const response = await userService.deleteUser(userId);
    if (response.success) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      return { success: true };
    } else {
      return { success: false, error: response.error };
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
