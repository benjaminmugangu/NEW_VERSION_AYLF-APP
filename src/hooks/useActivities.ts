// src/hooks/useActivities.ts
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

import * as activityService from '@/services/activityService';
import type { ActivityFormData } from '@/schemas/activity';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';
import type { Activity, ActivityStatus, User } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { getClientErrorMessage } from '@/lib/clientErrorHandler';

interface UseActivitiesParams {
  initialData?: Activity[];
  user: User | null;
}

export const useActivities = ({ initialData = [], user }: UseActivitiesParams) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });
  const [statusFilter, setStatusFilter] = useState<Record<ActivityStatus, boolean>>({ planned: true, in_progress: true, delayed: true, executed: true, canceled: true });
  const [levelFilter, setLevelFilter] = useState<Record<Activity['level'], boolean>>({ national: true, site: true, small_group: true });

  const filters = useMemo(() => ({
    user: user!,
    searchTerm,
    dateFilter,
    statusFilter,
    levelFilter,
  }), [user, searchTerm, dateFilter, statusFilter, levelFilter]);

  const { data: rawActivities, isLoading, error, refetch } = useQuery({
    queryKey: ['activities', filters],
    queryFn: async (): Promise<Activity[]> => {
      const response = await activityService.getFilteredActivities(filters);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch activities');
      }
      return response.data;
    },
    enabled: !!user,
    staleTime: 0,
  });

  const activities: Activity[] = rawActivities ?? ([] as Activity[]);

  const availableLevelFilters = useMemo(() => {
    if (!user) return [];
    if (user.role === ROLES.NATIONAL_COORDINATOR) return ["national", "site", "small_group"];
    if (user.role === ROLES.SITE_COORDINATOR) return ["site", "small_group"];
    if (user.role === ROLES.SMALL_GROUP_LEADER) return ["small_group"];
    return [];
  }, [user]);

  const canEditActivity = useCallback((activity: Activity): boolean => {
    if (!user) return false;

    switch (user.role) {
      case ROLES.NATIONAL_COORDINATOR:
        return true;
      case ROLES.SITE_COORDINATOR:
        return activity.siteId === user.siteId;
      case ROLES.SMALL_GROUP_LEADER:
        return activity.smallGroupId === user.smallGroupId;
      default:
        return false;
    }
  }, [user]);

  const createActivityMutation = useMutation<Activity, Error, Omit<ActivityFormData, 'createdBy'>>({
    mutationFn: async (activityData) => {
      const response = await activityService.createActivity({ ...activityData, createdBy: user!.id });
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to create activity');
      }
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Activity created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to create activity: ${getClientErrorMessage(error)}`, variant: 'destructive' });
    },
  });

  const updateActivityMutation = useMutation<Activity, Error, { id: string; data: Partial<ActivityFormData> }>({
    mutationFn: async ({ id, data }) => {
      const response = await activityService.updateActivity(id, data);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update activity');
      }
      return response.data;
    },
    onSuccess: (data, variables) => {
      toast({ title: 'Success', description: 'Activity updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['activityDetails', variables.id] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to update activity: ${getClientErrorMessage(error)}`, variant: 'destructive' });
    },
  });

  const deleteActivityMutation = useMutation<void, Error, string>({
    mutationFn: async (activityId: string) => {
      const response = await activityService.deleteActivity(activityId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete activity');
      }
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Activity deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to delete activity: ${getClientErrorMessage(error)}`, variant: 'destructive' });
    },
  });

  return {
    activities,
    isLoading,
    error,
    filters: { searchTerm, dateFilter, statusFilter, levelFilter },
    setSearchTerm,
    setDateFilter,
    setStatusFilter,
    setLevelFilter,
    refetch,
    availableLevelFilters,
    canEditActivity,
    createActivity: createActivityMutation.mutateAsync,
    updateActivity: updateActivityMutation.mutateAsync,
    deleteActivity: deleteActivityMutation.mutateAsync,
    isCreating: createActivityMutation.isPending,
    isUpdating: updateActivityMutation.isPending,
    isDeleting: deleteActivityMutation.isPending,
  };
};
