// src/hooks/useSites.ts
'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import siteService from '@/services/siteService';
import type { SiteFormData, SiteWithDetails } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/lib/constants';

const SITES_QUERY_KEY = 'sites';

export const useSites = () => {
  const { currentUser: user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: sites = [], isLoading, isError, error } = useQuery<SiteWithDetails[], Error>({
    queryKey: [SITES_QUERY_KEY, user?.id], // Depend on user ID to refetch on user change
    queryFn: () => siteService.getSitesWithDetails(user),
    enabled: !!user, // Only run the query if the user is logged in
  });

    const createSiteMutation = useMutation<any, Error, SiteFormData>({
    mutationFn: (newSite: SiteFormData) => siteService.createSite(newSite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SITES_QUERY_KEY, user?.id] });
    },
    onError: (error) => {
      // The error object from react-query is often not a direct Error instance
      // Best practice is to re-throw a new error with a clear message
      throw new Error(`Failed to create site: ${(error as Error).message}`);
    },
  });

    const updateSiteMutation = useMutation<any, Error, { id: string; siteData: Partial<SiteFormData> }>({
    mutationFn: ({ id, siteData }) => siteService.updateSite(id, siteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SITES_QUERY_KEY, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['siteDetails', user?.id] });
    },
    onError: (error) => {
      throw new Error(`Failed to update site: ${(error as Error).message}`);
    },
  });

    const deleteSiteMutation = useMutation<any, Error, string>({
    mutationFn: (id: string) => siteService.deleteSite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SITES_QUERY_KEY, user?.id] });
    },
    onError: (error) => {
      throw new Error(`Failed to delete site: ${(error as Error).message}`);
    },
  });

  const filteredSites = useMemo(() => {
    if (!searchTerm) {
      return sites;
    }
    return sites.filter(site =>
      site.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sites, searchTerm]);


  const canCreateSite = useMemo(() => user?.role === ROLES.NATIONAL_COORDINATOR, [user]);
  const canEditSite = useMemo(() => user?.role === ROLES.NATIONAL_COORDINATOR, [user]);
  const canDeleteSite = useMemo(() => user?.role === ROLES.NATIONAL_COORDINATOR, [user]);

  return {
    sites: filteredSites,
    allSites: sites, // For cases where the unfiltered list is needed
    isLoading,
    isError,
    error,
    createSite: createSiteMutation.mutateAsync,
    isCreating: createSiteMutation.isPending,
    updateSite: updateSiteMutation.mutateAsync,
    isUpdating: updateSiteMutation.isPending,
    deleteSite: deleteSiteMutation.mutateAsync,
    isDeleting: deleteSiteMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: [SITES_QUERY_KEY] }),
    searchTerm,
    setSearchTerm,
    canCreateSite,
    canEditSite,
    canDeleteSite,
  };
};
