// src/hooks/useSites.ts
'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import siteService from '@/services/siteService';
import type { SiteFormData, SiteWithDetails } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/lib/constants';

const SITES_QUERY_KEY = 'sites';

export const useSites = () => {
  const { currentUser: user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: sites = [], isLoading, isError, error } = useQuery<SiteWithDetails[], Error>({
    queryKey: [SITES_QUERY_KEY, user?.id], // Depend on user ID to refetch on user change
    queryFn: () => siteService.getSitesWithDetails(user),
    enabled: !!user, // Only run the query if the user is logged in
  });

    const createSiteMutation = useMutation<any, Error, SiteFormData>({
    mutationFn: (newSite: SiteFormData) => siteService.createSite(newSite),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Site created successfully.' });
      queryClient.invalidateQueries({ queryKey: [SITES_QUERY_KEY, user?.id] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to create site: ${error.message}`, variant: 'destructive' });
    },
  });

    const updateSiteMutation = useMutation<any, Error, { id: string; siteData: Partial<SiteFormData> }>({
    mutationFn: ({ id, siteData }) => siteService.updateSite(id, siteData),
    onSuccess: (data, variables) => {
      toast({ title: 'Success', description: 'Site updated successfully.' });
      queryClient.invalidateQueries({ queryKey: [SITES_QUERY_KEY, user?.id] });
      // Also invalidate the specific site details if it's being viewed
      queryClient.invalidateQueries({ queryKey: ['siteDetails', variables.id] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to update site: ${error.message}`, variant: 'destructive' });
    },
  });

    const deleteSiteMutation = useMutation<any, Error, string>({
    mutationFn: (id: string) => siteService.deleteSite(id),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Site deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: [SITES_QUERY_KEY, user?.id] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to delete site: ${error.message}`, variant: 'destructive' });
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
