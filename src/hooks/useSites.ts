// src/hooks/useSites.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import siteService from '@/services/siteService';
import { profileService } from '@/services/profileService';
import type { Site, User } from '@/lib/types';
import { ROLES } from '@/lib/constants';

export interface SiteWithDetails extends Site {
  membersCount: number;
  smallGroupsCount: number;
  coordinator?: User;
}

export const useSites = () => {
  const { currentUser } = useAuth();
  const [allSites, setAllSites] = useState<SiteWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSites = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    setError(null);
    const sitesResponse = await siteService.getFilteredSites({ user: currentUser });

    if (!sitesResponse.success || !sitesResponse.data) {
      setError(sitesResponse.error?.message || 'Failed to fetch sites.');
      setAllSites([]);
      setIsLoading(false);
      return;
    }

    const sitesData = sitesResponse.data;
    const coordinatorIds = sitesData
      .map(site => site.coordinatorId)
      .filter((id): id is string => !!id);

    const usersResponse = await profileService.getUsersByIds(coordinatorIds);
    const coordinatorsMap = (usersResponse.success && usersResponse.data)
      ? new Map(usersResponse.data.map(user => [user.id, user]))
      : new Map();

    const sitesWithDetails = await Promise.all(
      sitesData.map(async (site) => {
        const detailsResponse = await siteService.getSiteDetails(site.id);
        return {
          ...site,
          membersCount: (detailsResponse.success && detailsResponse.data) ? detailsResponse.data.membersCount : 0,
          smallGroupsCount: (detailsResponse.success && detailsResponse.data) ? detailsResponse.data.smallGroupsCount : 0,
          coordinator: site.coordinatorId ? coordinatorsMap.get(site.coordinatorId) : undefined,
        };
      })
    );

    setAllSites(sitesWithDetails);
    setIsLoading(false);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchSites();
    }
  }, [fetchSites, currentUser]);

  const deleteSite = async (siteId: string) => {
    const result = await siteService.deleteSite(siteId);
    if (result.success) {
      setAllSites(prev => prev.filter(s => s.id !== siteId));
      return { success: true };
    } else {
      return { success: false, error: result.error };
    }
  };

  const filteredSites = useMemo(() => {
    if (!searchTerm) {
      return allSites;
    }
    return allSites.filter(site =>
      site.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allSites, searchTerm]);

  const canCreateSite = useMemo(() => currentUser?.role === ROLES.NATIONAL_COORDINATOR, [currentUser]);
  const canEditSite = useMemo(() => currentUser?.role === ROLES.NATIONAL_COORDINATOR, [currentUser]);
  const canDeleteSite = useMemo(() => currentUser?.role === ROLES.NATIONAL_COORDINATOR, [currentUser]);

  return { 
    sites: filteredSites, 
    allSites, 
    isLoading, 
    error, 
    refetch: fetchSites, 
    deleteSite, 
    searchTerm, 
    setSearchTerm, 
    canCreateSite, 
    canEditSite, 
    canDeleteSite 
  };
};
