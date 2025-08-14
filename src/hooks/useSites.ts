// src/hooks/useSites.ts
'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import siteService from '@/services/siteService';
import type { SiteFormData, SiteWithDetails } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/lib/constants';

const SITES_QUERY_KEY = 'sites';

/**
 * Custom hook for managing site data.
 * Provides a query to fetch all sites with detailed information (coordinators, small groups count)
 * and mutations for creating, updating, and deleting sites.
 * It also includes logic for filtering and authorization based on the current user's role.
 * @returns An object containing site data, loading/error states, mutation functions, and helpers.
 */
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
    mutationFn: async (newSite: SiteFormData) => {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSite),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create site');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SITES_QUERY_KEY, user?.id] });
    },
    onError: (error: Error) => {
      // The error is now thrown from the mutation function itself, so we can just re-throw it
      // or handle it as needed (e.g., show a toast notification).
      console.error("Error creating site:", error.message);
      throw error; // Re-throw to be caught by the component
    },
  });

      const updateSiteMutation = useMutation<any, Error, { id: string; siteData: Partial<SiteFormData> }>({
    mutationFn: async ({ id, siteData }) => {
      const response = await fetch(`/api/sites/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update site');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SITES_QUERY_KEY, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['siteDetails', variables.id] });
    },
    onError: (error: Error) => {
      console.error("Error updating site:", error.message);
      throw error;
    },
  });

      const deleteSiteMutation = useMutation<any, Error, string>({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/sites/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete site');
      }
      // DELETE requests might not return a body, so we don't call .json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SITES_QUERY_KEY, user?.id] });
    },
    onError: (error: Error) => {
      console.error("Error deleting site:", error.message);
      throw error;
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
