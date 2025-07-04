// src/services/activityService.ts
'use client';

import { mockActivities, mockSites, mockSmallGroups } from '@/lib/mockData';
import type { Activity, ActivityFormData, ServiceResponse, User } from '@/lib/types';
import { applyDateFilter, type DateFilterValue } from '@/components/shared/DateRangeFilter';
import { ROLES } from '@/lib/constants';

export interface ActivityFilters {
  user: User | null;
  searchTerm?: string;
  dateFilter?: DateFilterValue;
  statusFilter?: Record<Activity['status'], boolean>;
  levelFilter?: Record<Activity['level'], boolean>;
}

const activityService = {
  getFilteredActivities: async (filters: ActivityFilters): Promise<ServiceResponse<Activity[]>> => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    const { user, searchTerm, dateFilter, statusFilter, levelFilter } = filters;

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // 1. Filter by user role
    let userAllowedActivities: Activity[];
    switch (user.role) {
      case ROLES.NATIONAL_COORDINATOR:
        userAllowedActivities = mockActivities;
        break;
      case ROLES.SITE_COORDINATOR:
        userAllowedActivities = mockActivities.filter(
          act => act.siteId === user.siteId || 
                 (act.level === 'small_group' && mockSmallGroups.find(sg => sg.id === act.smallGroupId)?.siteId === user.siteId)
        );
        break;
      case ROLES.SMALL_GROUP_LEADER:
        userAllowedActivities = mockActivities.filter(act => act.smallGroupId === user.smallGroupId);
        break;
      default:
        userAllowedActivities = [];
    }

    // Apply additional filters
    let filtered = userAllowedActivities;

    // 2. Date filter
    if (dateFilter) {
      filtered = applyDateFilter(filtered, dateFilter);
    }

    // 3. Search term filter
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(act => act.name.toLowerCase().includes(lowercasedTerm));
    }

    // 4. Status filter
    if (statusFilter) {
      const activeStatuses = Object.entries(statusFilter)
        .filter(([, isActive]) => isActive)
        .map(([status]) => status);
      if (activeStatuses.length > 0) {
        filtered = filtered.filter(act => activeStatuses.includes(act.status));
      }
    }

    // 5. Level filter
    if (levelFilter) {
      const activeLevels = Object.entries(levelFilter)
        .filter(([, isActive]) => isActive)
        .map(([level]) => level);
      if (activeLevels.length > 0) {
        filtered = filtered.filter(act => activeLevels.includes(act.level));
      }
    }

    return { success: true, data: filtered };
  },

  getActivityById: async (id: string): Promise<ServiceResponse<Activity>> => {
    await new Promise(resolve => setTimeout(resolve, 50));
    const activity = mockActivities.find(act => act.id === id);
    if (activity) {
      return Promise.resolve({ success: true, data: activity });
    } else {
      return Promise.resolve({ success: false, error: "Activity not found." });
    }
  },

  createActivity: async (activityData: ActivityFormData): Promise<ServiceResponse<Activity>> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (!activityData.name || activityData.name.trim().length < 3) {
      return Promise.resolve({ success: false, error: "Activity name must be at least 3 characters long." });
    }
    const newActivity: Activity = {
      id: `activity-${Date.now()}`,
      ...activityData,
      date: activityData.date.toISOString(),
    };
    mockActivities.push(newActivity);
    return Promise.resolve({ success: true, data: newActivity });
  },

  updateActivity: async (activityId: string, updatedData: Partial<ActivityFormData>): Promise<ServiceResponse<Activity>> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const activityIndex = mockActivities.findIndex(a => a.id === activityId);
    if (activityIndex === -1) {
      return Promise.resolve({ success: false, error: "Activity not found." });
    }
    const { date, ...restOfUpdatedData } = updatedData;
    const updatedFields: Partial<Activity> = { ...restOfUpdatedData };
    if (date) {
      updatedFields.date = date.toISOString();
    }
    mockActivities[activityIndex] = { ...mockActivities[activityIndex], ...updatedFields };
    return Promise.resolve({ success: true, data: mockActivities[activityIndex] });
  },

  deleteActivity: async (id: string): Promise<ServiceResponse<{ id: string }>> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockActivities.findIndex(act => act.id === id);
    if (index !== -1) {
      mockActivities.splice(index, 1);
      return Promise.resolve({ success: true, data: { id } });
    }
    return Promise.resolve({ success: false, error: "Activity not found." });
  },
};

export default activityService;
