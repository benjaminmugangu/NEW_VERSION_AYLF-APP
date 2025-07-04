// src/services/activityService.ts
import { supabase } from '@/lib/supabaseClient';
import type { Activity, ActivityFormData, ServiceResponse, User } from '@/lib/types';
import { getDateRangeFromFilterValue, type DateFilterValue } from '@/components/shared/DateRangeFilter';
import { ROLES } from '@/lib/constants';

// Helper to convert DB snake_case to frontend camelCase
const toActivityModel = (dbActivity: any): Activity => ({
  id: dbActivity.id,
  name: dbActivity.name,
  description: dbActivity.description,
  date: dbActivity.date,
  status: dbActivity.status,
  level: dbActivity.level,
  siteId: dbActivity.site_id,
  smallGroupId: dbActivity.small_group_id,
  participantsCount: dbActivity.participants_count,
  imageUrl: dbActivity.image_url,
  activityTypeId: dbActivity.activity_type_id,
});

export interface ActivityFilters {
  user: User | null;
  searchTerm?: string;
  dateFilter?: DateFilterValue;
  statusFilter?: Record<Activity['status'], boolean>;
  levelFilter?: Record<Activity['level'], boolean>;
}

const activityService = {
  getFilteredActivities: async (filters: ActivityFilters): Promise<ServiceResponse<Activity[]>> => {
    const { user, searchTerm, dateFilter, statusFilter, levelFilter } = filters;
    if (!user) return { success: false, error: { message: 'User not authenticated' } };

    let query = supabase.from('activities').select('*');

    // 1. Filter by user role
    switch (user.role) {
      case ROLES.SITE_COORDINATOR:
        if (user.siteId) {
          query = query.or(`level.eq.national,site_id.eq.${user.siteId}`);
        } else {
          query = query.eq('level', 'national');
        }
        break;
      case ROLES.SMALL_GROUP_LEADER:
        if (user.smallGroupId && user.siteId) {
          query = query.or(`level.eq.national,site_id.eq.${user.siteId},small_group_id.eq.${user.smallGroupId}`);
        } else if (user.siteId) {
          query = query.or(`level.eq.national,site_id.eq.${user.siteId}`);
        } else {
          query = query.eq('level', 'national');
        }
        break;
      // National coordinator can see all, so no initial filter needed.
      case ROLES.NATIONAL_COORDINATOR:
      default:
        break;
    }

    // 2. Date filter
    if (dateFilter) {
      const { startDate, endDate } = getDateRangeFromFilterValue(dateFilter);
      if (startDate) {
        query = query.gte('date', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('date', endDate.toISOString());
      }
    }

    // 3. Search term filter
    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }

    // 4. Status filter
    if (statusFilter) {
      const activeStatuses = Object.entries(statusFilter)
        .filter(([, isActive]) => isActive)
        .map(([status]) => status);
      if (activeStatuses.length > 0) {
        query = query.in('status', activeStatuses);
      }
    }

    // 5. Level filter
    if (levelFilter) {
      const activeLevels = Object.entries(levelFilter)
        .filter(([, isActive]) => isActive)
        .map(([level]) => level);
      if (activeLevels.length > 0) {
        query = query.in('level', activeLevels);
      }
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('Error fetching activities:', error);
      return { success: false, error: { message: error.message } };
    }

    const activities = data.map(toActivityModel);
    return { success: true, data: activities };
  },

  getActivityById: async (id: string): Promise<ServiceResponse<Activity>> => {
    const { data, error } = await supabase.from('activities').select('*').eq('id', id).single();
    if (error) return { success: false, error: { message: 'Activity not found.' } };
    return { success: true, data: toActivityModel(data) };
  },

  createActivity: async (activityData: ActivityFormData): Promise<ServiceResponse<Activity>> => {
    const { data, error } = await supabase
      .from('activities')
      .insert({
        name: activityData.name,
        description: activityData.description,
        date: activityData.date,
        status: activityData.status,
        level: activityData.level,
        site_id: activityData.siteId,
        small_group_id: activityData.smallGroupId,
        participants_count: activityData.participantsCount,
        image_url: activityData.imageUrl,
        activity_type_id: activityData.activityTypeId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating activity:', error);
      return { success: false, error: { message: error.message } };
    }
    return { success: true, data: toActivityModel(data) };
  },

  updateActivity: async (activityId: string, updatedData: Partial<ActivityFormData>): Promise<ServiceResponse<Activity>> => {
    const { data, error } = await supabase
      .from('activities')
      .update({
        name: updatedData.name,
        description: updatedData.description,
        date: updatedData.date,
        status: updatedData.status,
        level: updatedData.level,
        site_id: updatedData.siteId,
        small_group_id: updatedData.smallGroupId,
        participants_count: updatedData.participantsCount,
        image_url: updatedData.imageUrl,
        activity_type_id: updatedData.activityTypeId,
      })
      .eq('id', activityId)
      .select()
      .single();

    if (error) {
      console.error('Error updating activity:', error);
      return { success: false, error: { message: error.message } };
    }
    return { success: true, data: toActivityModel(data) };
  },

  deleteActivity: async (id: string): Promise<ServiceResponse<{ id: string }>> => {
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) return { success: false, error: { message: error.message } };
    return { success: true, data: { id } };
  },
};

export default activityService;
