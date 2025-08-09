// src/services/activityTypeService.ts
import { supabase } from '@/lib/supabaseClient';
import type { ActivityType } from '@/lib/types';

/**
 * Fetches all available activity types from the database.
 * @returns A ServiceResponse containing the list of all activity types.
 */
export const getAllActivityTypes = async (): Promise<ActivityType[]> => {
  const { data, error } = await supabase
    .from('activity_types')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[ActivityTypeService] Error in getAllActivityTypes:', error.message);
    throw new Error(error.message);
  }

  return data || [];
};

/**
 * Fetches a single activity type by its ID.
 * @param id The ID of the activity type to fetch.
 * @returns A ServiceResponse containing the activity type or an error.
 */
export const getActivityTypeById = async (id: string): Promise<ActivityType> => {
  const { data, error } = await supabase
    .from('activity_types')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`[ActivityTypeService] Error in getActivityTypeById for id ${id}:`, error.message);
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Activity type not found.');
  }

  return data;
};
