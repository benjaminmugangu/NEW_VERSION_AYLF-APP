// src/hooks/useActivities.ts
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

import activityService, { type ActivityFormData } from '@/services/activityService';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';
import type { Activity, ActivityStatus, SmallGroup } from '@/lib/types';
import { ROLES } from '@/lib/constants';

/**
 * Custom hook for managing activities.
 * Handles fetching, filtering (by date, status, level, search term), and mutations (create, update, delete).
 * Provides role-based logic for authorization (e.g., who can edit an activity).
 * Uses TanStack Query for state management, caching, and background refetching.
 * @returns An object containing activity data, loading/error states, filter states and setters, and mutation functions.
 */
export const useActivities = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });
  const [statusFilter, setStatusFilter] = useState<Record<ActivityStatus, boolean>>({ planned: true, in_progress: true, delayed: true, executed: true, canceled: true });
  const [levelFilter, setLevelFilter] = useState<Record<Activity['level'], boolean>>({ national: true, site: true, small_group: true });

  const filters = useMemo(() => ({
    user: currentUser!,
    searchTerm,
    dateFilter,
    statusFilter,
    levelFilter,
  }), [currentUser, searchTerm, dateFilter, statusFilter, levelFilter]);

  const { data: activities = [], isLoading, error, refetch } = useQuery<Activity[], Error>({
    queryKey: ['activities', filters],
    queryFn: () => activityService.getFilteredActivities(filters),
    enabled: !!currentUser,
  });

  const availableLevelFilters = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === ROLES.NATIONAL_COORDINATOR) return ["national", "site", "small_group"];
    if (currentUser.role === ROLES.SITE_COORDINATOR) return ["site", "small_group"];
    if (currentUser.role === ROLES.SMALL_GROUP_LEADER) return ["small_group"];
    return [];
  }, [currentUser]);



  const canEditActivity = useCallback((activity: Activity): boolean => {
    if (!currentUser) return false;

    switch (currentUser.role) {
      case ROLES.NATIONAL_COORDINATOR:
        return true;
      case ROLES.SITE_COORDINATOR:
        // A site coordinator can edit activities linked to their site.
        // This covers both 'site' level and 'small_group' level activities within their site.
        return activity.site_id === currentUser.siteId;
      case ROLES.SMALL_GROUP_LEADER:
        // A small group leader can only edit activities for their own group.
        return activity.small_group_id === currentUser.smallGroupId;
      default:
        return false;
    }
  }, [currentUser]);

    const createActivityMutation = useMutation<
    Activity,
    Error,
    Omit<ActivityFormData, 'created_by'>
  >({
    mutationFn: async (activityData) => {
      // Dates must be stringified for JSON transport
      const payload = {
        ...activityData,
        date: activityData.date.toISOString(),
      };

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create activity');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', filters] });
    },
    onError: (error: Error) => {
      console.error('Failed to create activity:', error.message);
      throw error;
    },
  });

    const updateActivityMutation = useMutation<
    Activity,
    Error,
    { id: string; data: Partial<ActivityFormData> }
  >({
    mutationFn: async ({ id, data }) => {
      const payload = {
        ...data,
        ...(data.date && { date: data.date.toISOString() }),
      };

      const response = await fetch(`/api/activities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update activity');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', filters] });
    },
    onError: (error: Error) => {
      console.error('Failed to update activity:', error.message);
      throw error;
    },
  });

    const deleteActivityMutation = useMutation<void, Error, string>({
    mutationFn: async (activityId: string) => {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete activity');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', filters] });
    },
    onError: (error: Error) => {
      console.error('Failed to delete activity:', error.message);
      throw error;
    },
  });

  return {
    activities,
    isLoading,
    error,
    filters: {
      searchTerm,
      dateFilter,
      statusFilter,
      levelFilter,
    },
    setSearchTerm,
    setDateFilter,
    setStatusFilter,
    setLevelFilter,
    refetch,
    availableLevelFilters,
    canEditActivity,
    createActivity: createActivityMutation.mutate,
    updateActivity: updateActivityMutation.mutate,
    deleteActivity: deleteActivityMutation.mutate,
    isCreating: createActivityMutation.isPending,
    isUpdating: updateActivityMutation.isPending,
    isDeleting: deleteActivityMutation.isPending,
  };
};
