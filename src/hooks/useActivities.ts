// src/hooks/useActivities.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

import { activityService } from '@/services/activityService';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';
import type { Activity, SmallGroup } from '@/lib/types';
import { ROLES } from '@/lib/constants';

export const useActivities = () => {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string } | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });
  const [statusFilter, setStatusFilter] = useState<Record<Activity['status'], boolean>>({ planned: true, executed: true, cancelled: true });
  const [levelFilter, setLevelFilter] = useState<Record<Activity['level'], boolean>>({ national: true, site: true, small_group: true });

  const availableLevelFilters = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === ROLES.NATIONAL_COORDINATOR) return ["national", "site", "small_group"];
    if (currentUser.role === ROLES.SITE_COORDINATOR) return ["site", "small_group"];
    if (currentUser.role === ROLES.SMALL_GROUP_LEADER) return ["small_group"];
    return [];
  }, [currentUser]);

  const fetchActivities = useCallback(async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    
    const response = await activityService.getFilteredActivities({
      user: currentUser,
      searchTerm,
      dateFilter,
      statusFilter,
      levelFilter,
    });

    if (response.success && response.data) {
      setActivities(response.data);
    } else {
      setError(response.error || { message: "An unknown error occurred." });
      setActivities([]);
    }
    setIsLoading(false);
  }, [currentUser, searchTerm, dateFilter, statusFilter, levelFilter]);

  useEffect(() => {
    if (currentUser) {
      fetchActivities();
    }
  }, [fetchActivities, currentUser]);

  const canEditActivity = useCallback((activity: Activity): boolean => {
    if (!currentUser) return false;

    switch (currentUser.role) {
      case ROLES.NATIONAL_COORDINATOR:
        return true;
      case ROLES.SITE_COORDINATOR:
        // A site coordinator can edit activities linked to their site.
        // This covers both 'site' level and 'small_group' level activities within their site.
        return activity.siteId === currentUser.siteId;
      case ROLES.SMALL_GROUP_LEADER:
        // A small group leader can only edit activities for their own group.
        return activity.smallGroupId === currentUser.smallGroupId;
      default:
        return false;
    }
  }, [currentUser]);

  const handleDeleteActivity = useCallback(async (activityId: string) => {
    const response = await activityService.deleteActivity(activityId);
    if (response.success) {
      // Re-fetch the data from the server to ensure consistency
      // instead of just optimistically updating the local state.
      fetchActivities();
      return { success: true };
    } else {
      setError(response.error || { message: 'Failed to delete activity.' });
      return { success: false, error: response.error };
    }
  }, [fetchActivities]);

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
    refetch: fetchActivities,
    availableLevelFilters,
    canEditActivity,
    handleDeleteActivity,
  };
};
