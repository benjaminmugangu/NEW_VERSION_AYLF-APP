// src/hooks/useSites.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import siteService from '@/services/siteService';
import userService from '@/services/userService';
import type { Site, User } from '@/lib/types';

export interface SiteWithDetails extends Site {
  membersCount: number;
  smallGroupsCount: number;
  coordinator?: User;
}

export const useSites = () => {
  const [allSites, setAllSites] = useState<SiteWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSites = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const sitesResponse = await siteService.getAllSites();

    if (!sitesResponse.success || !sitesResponse.data) {
      setError(sitesResponse.error || 'Failed to fetch sites.');
      setAllSites([]);
      setIsLoading(false);
      return;
    }

    const sitesData = sitesResponse.data;
    const coordinatorIds = sitesData
      .map(site => site.coordinatorId)
      .filter((id): id is string => !!id);

    const usersResponse = await userService.getUsersByIds(coordinatorIds);
    const coordinatorsMap = usersResponse.success
      ? new Map(usersResponse.data.map(user => [user.id, user]))
      : new Map();

    const sitesWithDetails = await Promise.all(
      sitesData.map(async (site) => {
        const detailsResponse = await siteService.getSiteDetails(site.id);
        return {
          ...site,
          membersCount: detailsResponse.success ? detailsResponse.data.membersCount : 0,
          smallGroupsCount: detailsResponse.success ? detailsResponse.data.smallGroupsCount : 0,
          coordinator: site.coordinatorId ? coordinatorsMap.get(site.coordinatorId) : undefined,
        };
      })
    );

    setAllSites(sitesWithDetails);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

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

  return { sites: filteredSites, allSites, isLoading, error, refetch: fetchSites, deleteSite, searchTerm, setSearchTerm };
};
