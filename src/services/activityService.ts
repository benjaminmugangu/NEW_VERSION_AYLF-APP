// src/services/activityService.ts
import { createClient } from '@/utils/supabase/client';
import * as z from 'zod';
import type { Activity, ActivityStatus, ActivityType, User, DbActivity } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { mapDbActivityToActivity, mapActivityFormDataToDb } from '@/lib/mappers';

const supabase = createClient();

// Zod schema for validating activity form data (camelCase)
export const activityFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  thematic: z.string().min(3, 'Thematic must be at least 3 characters long.'),
  date: z.date(),
  level: z.enum(["national", "site", "small_group"]),
  status: z.enum(["planned", "in_progress", "delayed", "executed", "canceled"]).default('planned'),
  siteId: z.string().optional(),
  smallGroupId: z.string().optional(),
  activityTypeId: z.string().min(1, 'Activity type is required.'),
  participantsCountPlanned: z.number().int().min(0).optional(),
  createdBy: z.string(),
}).refine(data => data.level !== 'site' || !!data.siteId, {
  message: 'Site is required for site-level activities.',
  path: ['siteId'],
}).refine(data => data.level !== 'small_group' || !!data.smallGroupId, {
  message: 'Small group is required for small group level activities.',
  path: ['smallGroupId'],
});

export type ActivityFormData = z.infer<typeof activityFormSchema>;

const SELECT_ACTIVITY_WITH_DETAILS = '*, sites:site_id(name), small_groups:small_group_id(name), activity_types:activity_type_id(name), activity_participants(count)';

const getFilteredActivities = async (filters: any): Promise<Activity[]> => {
  const { user, searchTerm, dateFilter, statusFilter, levelFilter } = filters;
  if (!user) throw new Error('User not authenticated.');

  let query = supabase.from('activities').select(SELECT_ACTIVITY_WITH_DETAILS);

  if (user.role === ROLES.SITE_COORDINATOR && user.siteId) {
    query = query.or(`level.eq.national,and(level.eq.site,site_id.eq.${user.siteId})`);
  } else if (user.role === ROLES.SMALL_GROUP_LEADER && user.siteId && user.smallGroupId) {
    query = query.or(`level.eq.national,and(level.eq.site,site_id.eq.${user.siteId}),and(level.eq.small_group,small_group_id.eq.${user.smallGroupId})`);
  }

  if (searchTerm) query = query.ilike('title', `%${searchTerm}%`);
  if (dateFilter?.from) query = query.gte('date', dateFilter.from.toISOString());
  if (dateFilter?.to) query = query.lte('date', dateFilter.to.toISOString());

  const activeStatusFilters = Object.entries(statusFilter || {}).filter(([, v]) => v).map(([k]) => k);
  if (activeStatusFilters.length > 0) query = query.in('status', activeStatusFilters);

  const activeLevelFilters = Object.entries(levelFilter || {}).filter(([, v]) => v).map(([k]) => k);
  if (activeLevelFilters.length > 0) query = query.in('level', activeLevelFilters);

  const { data, error } = await query.order('date', { ascending: false });

  if (error) {
    console.error('[ActivityService] Error in getFilteredActivities:', error.message);
    throw new Error(error.message);
  }

  return (data || []).map(item => mapDbActivityToActivity({
    ...(item as DbActivity),
    siteName: (item as any).sites?.name,
    smallGroupName: (item as any).small_groups?.name,
    activityTypeName: (item as any).activity_types?.name,
    participantsCount: (item as any).activity_participants?.[0]?.count ?? 0,
  }));
};

const getActivityById = async (id: string): Promise<Activity> => {
  const { data, error } = await supabase.from('activities').select(SELECT_ACTIVITY_WITH_DETAILS).eq('id', id).single();

  if (error || !data) {
    console.error(`[ActivityService] Error fetching activity ${id}:`, error?.message);
    throw new Error('Activity not found');
  }

  return mapDbActivityToActivity({
    ...(data as DbActivity),
    siteName: (data as any).sites?.name,
    smallGroupName: (data as any).small_groups?.name,
    activityTypeName: (data as any).activity_types?.name,
    participantsCount: (data as any).activity_participants?.[0]?.count ?? 0,
  });
};

const createActivity = async (activityData: ActivityFormData): Promise<Activity> => {
  const dbData = mapActivityFormDataToDb(activityData);

  const { data, error } = await supabase.from('activities').insert(dbData).select('id').single();

  if (error || !data) {
    console.error('[ActivityService] Error in createActivity:', error?.message);
    throw new Error(error?.message || 'Failed to create activity.');
  }
  return getActivityById(data.id);
};

const updateActivity = async (id: string, updatedData: Partial<ActivityFormData | { status: ActivityStatus }>): Promise<Activity> => {
  const dbData = mapActivityFormDataToDb(updatedData as Partial<ActivityFormData>);

  const { error } = await supabase.from('activities').update(dbData).eq('id', id);

  if (error) {
    console.error(`[ActivityService] Error in updateActivity for id ${id}:`, error.message);
    throw new Error(error.message);
  }
  return getActivityById(id);
};

const deleteActivity = async (id: string): Promise<void> => {
  const { error } = await supabase.from('activities').delete().eq('id', id);
  if (error) {
    console.error(`[ActivityService] Error in deleteActivity for id ${id}:`, error.message);
    throw new Error(error.message);
  }
};

const getActivityTypes = async (): Promise<ActivityType[]> => {
  const { data, error } = await supabase.from('activity_types').select('*');
  if (error) {
    console.error('[ActivityService] Error in getActivityTypes:', error.message);
    throw new Error(error.message);
  }
  return data || [];
};

export const activityService = {
  getFilteredActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  getActivityTypes,
};
