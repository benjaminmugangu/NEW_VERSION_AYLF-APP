// src/services/profileService.ts
import { createClient } from '@/utils/supabase/client';
import { DbUser, User } from '@/lib/types';
import { mapDbUserToUser, mapUserToDb } from '@/lib/mappers';

const supabase = createClient();

const profileService = {
  /**
   * Retrieves a user's profile by their ID, including enriched data.
   */
  async getProfile(userId: string): Promise<User> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, site:site_id(name), small_group:small_group_id(name)')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[ProfileService] Error in getProfile:', error.message);
      throw new Error(error.message);
    }
    if (!data) throw new Error('Profile not found.');

    const dbUserWithRelations = {
      ...data,
      siteName: data.site?.name || undefined,
      smallGroupName: data.small_group?.name || undefined,
    };

    return mapDbUserToUser(dbUserWithRelations as any);
  },

  /**
   * Updates a user's profile.
   */
  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    if ('role' in updates) {
      console.warn(`[ProfileService] Attempted to change role for user ${userId}. This is not allowed.`);
      delete updates.role;
    }

    const dbUpdates = mapUserToDb(updates);

    const { data, error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', userId)
      .select('*, site:site_id(name), small_group:small_group_id(name)')
      .single();

    if (error) {
      console.error('[ProfileService] Error in updateProfile:', error.message);
      throw new Error(error.message);
    }

    const dbUserWithRelations = {
      ...data,
      siteName: data.site?.name || undefined,
      smallGroupName: data.small_group?.name || undefined,
    };

    return mapDbUserToUser(dbUserWithRelations as any);
  },

  /**
   * Retrieves all users with their assignment details.
   */
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.rpc('get_users_with_details');

    if (error) {
      console.error('[ProfileService] Error in getUsers:', error.message);
      throw new Error(error.message);
    }

    return (data as any[]).map(u => mapDbUserToUser(u)) ?? [];
  },

  /**
   * Retrieves users eligible for leadership roles.
   */
  async getEligiblePersonnel(siteId: string, smallGroupId?: string): Promise<User[]> {
    let query = supabase.from('profiles').select('*').neq('status', 'inactive');

    const leaderFilterParts = ['small_group_id.is.null'];
    if (smallGroupId) {
      leaderFilterParts.push(`small_group_id.eq.${smallGroupId}`);
    }

    const roleFilter = [
      `role.eq.NATIONAL_COORDINATOR`,
      `and(role.eq.SITE_COORDINATOR,site_id.eq.${siteId})`,
      `and(role.eq.SMALL_GROUP_LEADER,or(${leaderFilterParts.join(',')}))`
    ].join(',');

    query = query.or(roleFilter);

    const { data, error } = await query;

    if (error) {
      console.error('[ProfileService] Error in getEligiblePersonnel:', error.message);
      throw new Error(error.message);
    }

    return (data as DbUser[]).map(u => mapDbUserToUser(u)) ?? [];
  },

  /**
   * Permanently deletes a user.
   */
  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase.rpc('delete_user_permanently', { user_id: userId });

    if (error) {
      console.error('[ProfileService] Error in deleteUser:', error.message);
      throw new Error(error.message);
    }
  },

  /**
   * Retrieves multiple user profiles by their IDs.
   */
  async getUsersByIds(userIds: string[]): Promise<User[]> {
    if (!userIds || userIds.length === 0) return [];

    const { data, error } = await supabase.from('profiles').select('*').in('id', userIds);

    if (error) {
      console.error('[ProfileService] Error in getUsersByIds:', error.message);
      throw new Error(error.message);
    }

    return (data as DbUser[]).map(u => mapDbUserToUser(u)) ?? [];
  },
};

export { profileService };
