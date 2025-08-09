// src/services/activityService.ts
import { supabase } from '@/lib/supabaseClient';
import * as z from 'zod';
import type { Activity, ActivityStatus, ActivityType, User } from '@/lib/types';
import { ROLES } from '@/lib/constants';

// Zod schema for validating activity form data
export const activityFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  thematic: z.string().min(3, 'Thematic must be at least 3 characters long.'),
  date: z.date(),
  level: z.enum(["national", "site", "small_group"]),
  status: z.enum(["PLANNED", "EXECUTED", "CANCELED"]).default('PLANNED'),
  site_id: z.string().optional(),
  small_group_id: z.string().optional(),
  activity_type_id: z.string().min(1, 'Activity type is required.'),
  participants_count_planned: z.number().int().min(0).optional(),
  created_by: z.string(),
}).refine(data => data.level !== 'site' || !!data.site_id, {
  message: 'Site is required for site-level activities.',
  path: ['site_id'],
}).refine(data => data.level !== 'small_group' || !!data.small_group_id, {
  message: 'Small group is required for small group level activities.',
  path: ['small_group_id'],
});

export type ActivityFormData = z.infer<typeof activityFormSchema>;

// Converts frontend camelCase data to database snake_case format
const toActivityDbData = (data: Partial<ActivityFormData>): any => {
  const dbData: { [key: string]: any } = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      dbData[dbKey] = value;
    }
  });
  // Ensure date is in ISO format
  if (data.date instanceof Date) {
    dbData.date = data.date.toISOString();
  }
  return dbData;
};

// Converts database snake_case data to frontend Activity model (camelCase)
const toActivityModel = (dbActivity: any): Activity => ({
  id: dbActivity.id,
  title: dbActivity.title,
  thematic: dbActivity.thematic,
  date: dbActivity.date,
  level: dbActivity.level,
  status: dbActivity.status,
  site_id: dbActivity.site_id,
  small_group_id: dbActivity.small_group_id,
  activity_type_id: dbActivity.activity_type_id,
  participants_count_planned: dbActivity.participants_count_planned,
  created_by: dbActivity.created_by,
  created_at: dbActivity.created_at,
  // Enriched data from joins
  siteName: dbActivity.sites?.name || null,
  smallGroupName: dbActivity.small_groups?.name || null,
  activityTypeName: dbActivity.activity_types?.name || null,
  participantsCount: Array.isArray(dbActivity.activity_participants) ? dbActivity.activity_participants[0]?.count : 0,
});

const getFilteredActivities = async (filters: any): Promise<Activity[]> => {
  const { user, searchTerm, dateFilter, statusFilter, levelFilter } = filters;

  if (!user) throw new Error('User not authenticated.');

  let query = supabase
    .from('activities')
    .select('*, sites:site_id(name), small_groups:small_group_id(name), activity_types:activity_type_id(name)');

  // Role-based filtering
  if (user.role === ROLES.SITE_COORDINATOR && user.siteId) {
    query = query.or(`level.eq.national,and(level.eq.site,site_id.eq.${user.siteId})`);
  } else if (user.role === ROLES.SMALL_GROUP_LEADER && user.siteId && user.smallGroupId) {
    query = query.or(`level.eq.national,and(level.eq.site,site_id.eq.${user.siteId}),and(level.eq.small_group,small_group_id.eq.${user.smallGroupId})`);
  }

  // Search term filter
  if (searchTerm) {
    query = query.ilike('title', `%${searchTerm}%`);
  }

  // Date filter
  if (dateFilter && dateFilter.from) {
    query = query.gte('date', dateFilter.from.toISOString());
  }
  if (dateFilter && dateFilter.to) {
    query = query.lte('date', dateFilter.to.toISOString());
  }

  // Status filter
  const activeStatusFilters = Object.entries(statusFilter)
    .filter(([, isActive]) => isActive)
    .map(([status]) => status);

  if (activeStatusFilters.length > 0) {
    query = query.in('status', activeStatusFilters);
  }

  // Level filter
  const activeLevelFilters = Object.entries(levelFilter)
    .filter(([, isActive]) => isActive)
    .map(([level]) => level);

  if (activeLevelFilters.length > 0) {
    query = query.in('level', activeLevelFilters);
  }

  const { data: activitiesData, error } = await query.order('date', { ascending: false });

  if (error) {
    console.error('[ActivityService] Error in getFilteredActivities:', error.message);
    throw new Error(`[ActivityService] Error in getFilteredActivities: "${error.message}"`);
  }
  
  if (!activitiesData) return [];

  const activities = activitiesData.map(toActivityModel);

  // Fetch participant counts for each activity using the RPC
  const activitiesWithCounts = await Promise.all(
    activities.map(async (activity) => {
      const { data: count, error: countError } = await supabase.rpc('get_participant_count', { p_activity_id: activity.id });
      if (countError) {
        console.error(`[ActivityService] Error fetching participant count for activity ${activity.id}:`, countError.message);
        return { ...activity, participantsCount: 0 }; // Default to 0 on error
      }
      return { ...activity, participantsCount: count };
    })
  );

  return activitiesWithCounts;
};

const getActivitiesByRole = async (user: User): Promise<Activity[]> => {
  if (!user) throw new Error('User not authenticated.');

  let query = supabase
    .from('activities')
    .select('*, sites:site_id(name), small_groups:small_group_id(name), activity_types:activity_type_id(name)');

  // Role-based filtering
  if (user.role === ROLES.SITE_COORDINATOR && user.siteId) {
    query = query.or(`level.eq.national,and(level.eq.site,site_id.eq.${user.siteId})`);
  } else if (user.role === ROLES.SMALL_GROUP_LEADER && user.siteId && user.smallGroupId) {
    query = query.or(`level.eq.national,and(level.eq.site,site_id.eq.${user.siteId}),and(level.eq.small_group,small_group_id.eq.${user.smallGroupId})`);
  }
  // National coordinator sees all, so no .or() filter is needed.

  const { data: activitiesData, error } = await query.order('date', { ascending: false });

  if (error) {
    console.error('[ActivityService] Error in getActivitiesByRole:', error.message);
    throw new Error(error.message);
  }

  if (!activitiesData) return [];

  const activities = activitiesData.map(toActivityModel);

  // Fetch participant counts for each activity using the RPC
  const activitiesWithCounts = await Promise.all(
    activities.map(async (activity) => {
      const { data: count, error: countError } = await supabase.rpc('get_participant_count', { p_activity_id: activity.id });
      if (countError) {
        console.error(`[ActivityService] Error fetching participant count for activity ${activity.id}:`, countError.message);
        return { ...activity, participantsCount: 0 }; // Default to 0 on error
      }
      return { ...activity, participantsCount: count };
    })
  );

  return activitiesWithCounts;
};

const getPlannedActivitiesForUser = async (user: User): Promise<Activity[]> => {
  if (!user) throw new Error('User not authenticated.');

  const allActivities = await getActivitiesByRole(user);
  return allActivities.filter(activity => activity.status === 'PLANNED');
};

const getActivityById = async (id: string): Promise<Activity> => {
  const { data, error } = await supabase
    .from('activities')
    .select('*, sites:site_id(name), small_groups:small_group_id(name), activity_types:activity_type_id(name)')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Activity not found');
  }

  let activity = toActivityModel(data);

  // Fetch participant count using the RPC
  const { data: count, error: countError } = await supabase.rpc('get_participant_count', { p_activity_id: activity.id });

  if (countError) {
    console.error(`[ActivityService] Error fetching participant count for activity ${activity.id}:`, countError.message);
    // We can decide to throw or return with a default count
    activity.participantsCount = 0;
  } else {
    activity.participantsCount = count;
  }

  return activity;
};

const createActivity = async (activityData: Omit<ActivityFormData, 'created_by'>, userId: string): Promise<Activity> => {
  const dbData = toActivityDbData({ ...activityData, created_by: userId });

  const { data, error } = await supabase
    .from('activities')
    .insert(dbData)
    .select('id')
    .single();

  if (error) {
    console.error('[ActivityService] Error in createActivity:', error.message);
    throw new Error(error.message);
  }
  return getActivityById(data.id);
};

const updateActivity = async (id: string, updatedData: Partial<ActivityFormData | { status: ActivityStatus }>): Promise<Activity> => {
  const dbData = toActivityDbData(updatedData as Partial<ActivityFormData>);

  const { error } = await supabase
    .from('activities')
    .update(dbData)
    .eq('id', id);

  if (error) {
    console.error(`[ActivityService] Error in updateActivity for id ${id}:`, error.message);
    throw new Error(error.message);
  }
  return getActivityById(id);
};

const deleteActivity = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id);
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
  getActivitiesByRole,
  getPlannedActivitiesForUser,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  getActivityTypes,
};
