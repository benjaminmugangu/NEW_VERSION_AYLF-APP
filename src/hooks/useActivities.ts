// src/hooks/useActivities.ts
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

import { activityService, type ActivityFormData } from '@/services/activityService';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';
import type { Activity, ActivityStatus, SmallGroup } from '@/lib/types';
import { ROLES } from '@/lib/constants';

export const useActivities = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });
  const [statusFilter, setStatusFilter] = useState<Record<ActivityStatus, boolean>>({ PLANNED: true, EXECUTED: true, CANCELED: true });
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
    any,
    Error,
    Omit<ActivityFormData, 'createdBy'>
  >({
    mutationFn: (activityData) =>
      activityService.createActivity(activityData, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', filters] });
    },
    onError: (error) => {
      throw new Error(`Failed to create activity: ${(error as Error).message}`);
    },
  });

  const updateActivityMutation = useMutation<
    any,
    Error,
    { id: string; data: Partial<ActivityFormData> }
  >({
    mutationFn: ({ id, data }) => activityService.updateActivity(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', filters] });
    },
    onError: (error) => {
      throw new Error(`Failed to update activity: ${(error as Error).message}`);
    },
  });

  const deleteActivityMutation = useMutation<any, Error, string>({
    mutationFn: (activityId: string) => activityService.deleteActivity(activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', filters] });
    },
    onError: (error) => {
      throw new Error(`Failed to delete activity: ${(error as Error).message}`);
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
