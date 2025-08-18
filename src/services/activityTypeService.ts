// src/services/activityTypeService.ts
import { createClient } from '@/utils/supabase/client';
import type { ActivityType } from '@/lib/types';

/**
 * Fetches all available activity types from the database.
 * @returns A promise that resolves to an array of activity types.
 * @throws An error if the database query fails.
 */
export const getActivityTypes = async (): Promise<ActivityType[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('activity_types')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[ActivityTypeService] Error in getActivityTypes:', error.message);
    console.error('[ActivityTypeService] Error in getAllActivityTypes:', error.message);
    throw new Error(error.message);
  }

  return data || [];
};

/**
 * Fetches a single activity type by its ID.
 * @param id The ID of the activity type to fetch.
 * @returns A promise that resolves to the activity type.
 * @throws An error if the activity type is not found or the query fails.
 */
export const getActivityTypeById = async (id: string): Promise<ActivityType> => {
  const supabase = createClient();
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
