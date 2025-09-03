// src/services/activityService.ts
import { createClient as createBrowserClient } from '@/utils/supabase/client';
import * as z from 'zod';
import type { Activity, ActivityStatus, ActivityType, User } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

// Select appropriate Supabase client for environment
const getSupabase = async () => {
  if (typeof window === 'undefined') {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    return await createSupabaseServerClient();
  }
  return createBrowserClient();
};

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

const mapRowToActivity = (item: Tables<'activities'> & any): Activity => {
  return {
    id: item.id,
    title: item.name,
    thematic: item.description ?? '',
    date: item.date ?? '',
    level: (item.level ?? 'national') as Activity['level'],
    status: (item.status ?? 'planned') as ActivityStatus,
    siteId: item.site_id ?? undefined,
    smallGroupId: item.small_group_id ?? undefined,
    activityTypeId: item.activity_type_id ?? '',
    participantsCountPlanned: item.participants_count ?? undefined,
    createdBy: item.created_by ?? '',
    createdAt: item.created_at ?? '',
    siteName: item.sites?.name,
    smallGroupName: item.small_groups?.name,
    activityTypeName: item.activity_types?.name,
    participantsCount: item.activity_participants?.[0]?.count ?? 0,
  };
};

const getFilteredActivities = async (filters: any): Promise<Activity[]> => {
  const { user, searchTerm, dateFilter, statusFilter, levelFilter } = filters;
  if (!user) throw new Error('User not authenticated.');

  const supabase = await getSupabase();
  let query = supabase.from('activities').select(SELECT_ACTIVITY_WITH_DETAILS);

  if (user.role === ROLES.SITE_COORDINATOR && user.siteId) {
    query = query.or(`level.eq.national,and(level.eq.site,site_id.eq.${user.siteId})`);
  } else if (user.role === ROLES.SMALL_GROUP_LEADER && user.siteId && user.smallGroupId) {
    query = query.or(`level.eq.national,and(level.eq.site,site_id.eq.${user.siteId}),and(level.eq.small_group,small_group_id.eq.${user.smallGroupId})`);
  }

  if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);
  if (dateFilter?.from) query = query.gte('date', dateFilter.from.toISOString());
  if (dateFilter?.to) query = query.lte('date', dateFilter.to.toISOString());

  const activeStatusFilters = Object.entries(statusFilter || {})
    .filter(([, v]) => v)
    .map(([k]) => k as ActivityStatus);
  if (activeStatusFilters.length > 0) {
    query = query.in('status', activeStatusFilters as readonly (ActivityStatus | null)[]);
  }

  const activeLevelFilters = Object.entries(levelFilter || {})
    .filter(([, v]) => v)
    .map(([k]) => k as Activity['level']);
  if (activeLevelFilters.length > 0) {
    query = query.in('level', activeLevelFilters as readonly Activity['level'][]);
  }

  const { data, error } = await query.order('date', { ascending: false });

  if (error) {
    console.error('[ActivityService] Error in getFilteredActivities:', error.message);
    throw new Error(error.message);
  }

  return (data || []).map(item => mapRowToActivity(item as Tables<'activities'> & any));
};

const getActivityById = async (id: string): Promise<Activity> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('activities').select(SELECT_ACTIVITY_WITH_DETAILS).eq('id', id).single();

  if (error || !data) {
    console.error(`[ActivityService] Error fetching activity ${id}:`, error?.message);
    throw new Error('Activity not found');
  }

  return mapRowToActivity(data as Tables<'activities'> & any);
};

const createActivity = async (activityData: ActivityFormData): Promise<Activity> => {
  const dbData: TablesInsert<'activities'> = {
    name: activityData.title,
    description: activityData.thematic,
    date: activityData.date.toISOString(),
    level: activityData.level,
    status: activityData.status,
    site_id: activityData.siteId,
    small_group_id: activityData.smallGroupId,
    activity_type_id: activityData.activityTypeId,
    participants_count: activityData.participantsCountPlanned,
    created_by: activityData.createdBy,
  };

  const supabase = await getSupabase();
  const { data, error } = await supabase.from('activities').insert(dbData).select('id').single();

  if (error || !data) {
    console.error('[ActivityService] Error in createActivity:', error?.message);
    throw new Error(error?.message || 'Failed to create activity.');
  }
  return getActivityById(data.id);
};

const updateActivity = async (id: string, updatedData: Partial<ActivityFormData | { status: ActivityStatus }>): Promise<Activity> => {
  const dbData: TablesUpdate<'activities'> = {};
  const data = updatedData as Partial<ActivityFormData> & { status?: ActivityStatus };
  if (data.title !== undefined) dbData.name = data.title;
  if (data.thematic !== undefined) dbData.description = data.thematic as any;
  if (data.date !== undefined) dbData.date = data.date.toISOString();
  if (data.level !== undefined) dbData.level = data.level;
  if (data.status !== undefined) dbData.status = data.status as any;
  if (data.siteId !== undefined) dbData.site_id = data.siteId;
  if (data.smallGroupId !== undefined) dbData.small_group_id = data.smallGroupId;
  if (data.activityTypeId !== undefined) dbData.activity_type_id = data.activityTypeId;
  if (data.participantsCountPlanned !== undefined) dbData.participants_count = data.participantsCountPlanned as any;
  if (data.createdBy !== undefined) dbData.created_by = data.createdBy as any;

  const supabase = await getSupabase();
  const { error } = await supabase.from('activities').update(dbData).eq('id', id);

  if (error) {
    console.error(`[ActivityService] Error in updateActivity for id ${id}:`, error.message);
    throw new Error(error.message);
  }
  return getActivityById(id);
};

const deleteActivity = async (id: string): Promise<void> => {
  const supabase = await getSupabase();
  const { error } = await supabase.from('activities').delete().eq('id', id);
  if (error) {
    console.error(`[ActivityService] Error in deleteActivity for id ${id}:`, error.message);
    throw new Error(error.message);
  }
};

const getActivityTypes = async (): Promise<ActivityType[]> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('activity_types').select('*');
  if (error) {
    console.error('[ActivityService] Error in getActivityTypes:', error.message);
    throw new Error(error.message);
  }
  // Map DB rows (no category column) to frontend ActivityType, providing a default category
  return (data || []).map((row: Tables<'activity_types'>) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    category: 'community',
  }));
};

export const activityService = {
  getFilteredActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  getActivityTypes,
};
