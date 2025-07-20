// src/services/activityService.ts
import { supabase } from '@/lib/supabaseClient';
import type { Activity, ActivityFormData, ActivityType, ServiceResponse, User } from '@/lib/types';
import { getDateRangeFromFilterValue, type DateFilterValue } from '@/components/shared/DateRangeFilter';
import { ROLES } from '@/lib/constants';

// Helper to convert DB snake_case to frontend camelCase
const toActivityModel = (dbActivity: any): Activity => {
  return {
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
    deleted_at: dbActivity.deleted_at,
    // Enriched data from joins
    siteName: dbActivity.sites?.name,
    smallGroupName: dbActivity.small_groups?.name,
    activityTypeName: dbActivity.activity_types?.name,
  };
};

const getFilteredActivities = async (filters: { user: User; searchTerm?: string; dateFilter?: DateFilterValue; statusFilter?: { [key: string]: boolean }; levelFilter?: { [key: string]: boolean } }): Promise<ServiceResponse<Activity[]>> => {
  const { user, searchTerm, dateFilter, statusFilter, levelFilter } = filters;
  if (!user) return { success: false, error: { message: 'User not authenticated' } };

  let query = supabase
    .from('activities')
    .select('*, sites:site_id(name), small_groups:small_group_id(name), activity_types:activity_type_id(name)');

  // Role-based filtering
  switch (user.role) {
    case ROLES.SITE_COORDINATOR:
      if (user.siteId) query = query.or(`level.eq.national,site_id.eq.${user.siteId}`);
      else query = query.eq('level', 'national');
      break;
    case ROLES.SMALL_GROUP_LEADER:
      if (user.smallGroupId && user.siteId) {
        const siteFilter = `and(level.eq.site,site_id.eq.${user.siteId})`;
        const smallGroupFilter = `and(level.eq.small_group,small_group_id.eq.${user.smallGroupId})`;
        query = query.or(`level.eq.national,${siteFilter},${smallGroupFilter}`);
      } else if (user.siteId) {
        query = query.or(`level.eq.national,and(level.eq.site,site_id.eq.${user.siteId})`);
      } else {
        query = query.eq('level', 'national');
      }
      break;
  }

  if (dateFilter) {
    const { startDate, endDate } = getDateRangeFromFilterValue(dateFilter);
    if (startDate) query = query.gte('date', startDate.toISOString());
    if (endDate) query = query.lte('date', endDate.toISOString());
  }

  if (searchTerm) {
    query = query.ilike('name', `%${searchTerm}%`);
  }

  if (statusFilter) {
    const active = Object.keys(statusFilter).filter(k => statusFilter[k as keyof typeof statusFilter]);
    if (active.length > 0) query = query.in('status', active);
  }

  if (levelFilter) {
    const active = Object.keys(levelFilter).filter(k => levelFilter[k as keyof typeof levelFilter]);
    if (active.length > 0) query = query.in('level', active);
  }

  const { data, error } = await query.order('date', { ascending: false });
  if (error) return { success: false, error: { message: error.message } };
  return { success: true, data: data.map(toActivityModel) };
};

const getActivityById = async (id: string): Promise<ServiceResponse<Activity>> => {
  const { data, error } = await supabase
    .from('activities')
    .select('*, sites:site_id(name), small_groups:small_group_id(name), activity_types:activity_type_id(name)')
    .eq('id', id)
    .single();
  if (error) return { success: false, error: { message: 'Activity not found.' } };
  return { success: true, data: toActivityModel(data) };
};

const createActivity = async (activityData: Omit<ActivityFormData, 'createdBy'>, userId: string): Promise<ServiceResponse<Activity>> => {
  const { data, error } = await supabase
    .from('activities')
    .insert({ ...activityData, created_by: userId })
    .select('id')
    .single();
  if (error) return { success: false, error: { message: error.message } };
  return getActivityById(data.id);
};

const updateActivity = async (id: string, updatedData: Partial<ActivityFormData>): Promise<ServiceResponse<Activity>> => {
  const { createdBy, ...rest } = updatedData;
  const { error } = await supabase
    .from('activities')
    .update({ ...rest })
    .eq('id', id);
  if (error) return { success: false, error: { message: error.message } };
  return getActivityById(id);
};

const deleteActivity = async (id: string): Promise<ServiceResponse<null>> => {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id);
  if (error) return { success: false, error: { message: error.message } };
  return { success: true, data: null };
};

const getRelatedActivities = async (member: { siteId?: string; smallGroupId?: string }): Promise<ServiceResponse<Activity[]>> => {
  if (!member.siteId && !member.smallGroupId) {
    // Only national activities if member has no affiliations
    return getFilteredActivities({ user: { role: ROLES.NATIONAL_COORDINATOR } as User });
  }

  let filterConditions = ['level.eq.national'];
  if (member.siteId) {
    filterConditions.push(`and(level.eq.site,site_id.eq.${member.siteId})`);
  }
  if (member.smallGroupId) {
    filterConditions.push(`and(level.eq.small_group,small_group_id.eq.${member.smallGroupId})`);
  }

  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*, sites:site_id(name), small_groups:small_group_id(name), activity_types:activity_type_id(name)')
      .or(filterConditions.join(','))
      .order('date', { ascending: false })
      .limit(5); // Limit to a reasonable number for a details page

    if (error) {
      return { success: false, error: { message: error.message } };
    }
    return { success: true, data: data.map(toActivityModel) };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { success: false, error: { message: error } };
  }
};

const getActivityTypes = async (): Promise<ServiceResponse<ActivityType[]>> => {
  const { data, error } = await supabase.from('activity_types').select('*');
  if (error) return { success: false, error: { message: error.message } };
  return { success: true, data: data || [] };
};

export const activityService = {
  getFilteredActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  getActivityTypes,
  getRelatedActivities,
};


