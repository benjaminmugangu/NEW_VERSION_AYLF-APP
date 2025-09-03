// src/services/profileService.ts
import { createClient as createBrowserClient } from '@/utils/supabase/client';
import { DbUser, User } from '@/lib/types';

const getSupabase = async () => {
  if (typeof window === 'undefined') {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    return await createSupabaseServerClient();
  }
  return createBrowserClient();
};

const profileService = {
  /**
   * Retrieves a user's profile by their ID, including enriched data.
   */
  async getProfile(userId: string): Promise<User> {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, status, site_id, small_group_id, mandate_start_date, mandate_end_date, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[ProfileService] Error in getProfile:', error.message);
      throw new Error(error.message);
    }
    if (!data) throw new Error('Profile not found.');

    // Direct mapping without using mapDbUserToUser to avoid recursion
    return {
      id: data.id,
      name: data.name || '',
      email: data.email || '',
      role: data.role as any,
      status: data.status as any,
      siteId: data.site_id || undefined,
      smallGroupId: data.small_group_id || undefined,
      mandateStartDate: data.mandate_start_date || undefined,
      mandateEndDate: data.mandate_end_date || undefined,
      createdAt: data.created_at || undefined,
    };
  },

  /**
   * Updates a user's profile.
   */
  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    if ('role' in updates) {
      console.warn(`[ProfileService] Attempted to change role for user ${userId}. This is not allowed.`);
      delete updates.role;
    }

    // Local mapper to avoid importing from lib/mappers (prevents circular deps)
    const mapUserToDb = (u: Partial<User>): Partial<DbUser> => {
      const dbUpdates: Partial<DbUser> = {};
      if (u.name !== undefined) dbUpdates.name = u.name;
      if (u.email !== undefined) dbUpdates.email = u.email;
      if (u.role !== undefined) dbUpdates.role = u.role as any;
      if (u.status !== undefined) dbUpdates.status = u.status as any;
      if (u.siteId !== undefined) dbUpdates.site_id = u.siteId;
      if (u.smallGroupId !== undefined) dbUpdates.small_group_id = u.smallGroupId;
      if (u.mandateStartDate !== undefined) dbUpdates.mandate_start_date = u.mandateStartDate as any;
      if (u.mandateEndDate !== undefined) dbUpdates.mandate_end_date = u.mandateEndDate as any;
      return dbUpdates;
    };

    const dbUpdates = mapUserToDb(updates);

    const supabase = await getSupabase();
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

    // Direct mapping to avoid recursion
    return {
      id: data.id,
      name: data.name || '',
      email: data.email || '',
      role: data.role as any,
      status: data.status as any,
      siteId: data.site_id || undefined,
      smallGroupId: data.small_group_id || undefined,
      mandateStartDate: data.mandate_start_date || undefined,
      mandateEndDate: data.mandate_end_date || undefined,
      createdAt: data.created_at || undefined,
      siteName: dbUserWithRelations.siteName,
      smallGroupName: dbUserWithRelations.smallGroupName,
    };
  },

  /**
   * Retrieves all users with their assignment details.
   */
  async getUsers(): Promise<User[]> {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc('get_users_with_details');

    if (error) {
      console.error('[ProfileService] Error in getUsers:', error.message);
      throw new Error(error.message);
    }

    // Direct mapping to avoid recursion
    return (data as any[]).map(u => ({
      id: u.id,
      name: u.name || '',
      email: u.email || '',
      role: u.role as any,
      status: u.status as any,
      siteId: u.site_id || undefined,
      smallGroupId: u.small_group_id || undefined,
      mandateStartDate: u.mandate_start_date || undefined,
      mandateEndDate: u.mandate_end_date || undefined,
      createdAt: u.created_at || undefined,
      siteName: u.site_name || undefined,
      smallGroupName: u.small_group_name || undefined,
    })) ?? [];
  },

  /**
   * Retrieves users eligible for leadership roles.
   */
  async getEligiblePersonnel(siteId: string, smallGroupId?: string): Promise<User[]> {
    const supabase = await getSupabase();
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

    // Direct mapping to avoid recursion
    return (data as any[]).map(u => ({
      id: u.id,
      name: u.name || '',
      email: u.email || '',
      role: u.role as any,
      status: u.status as any,
      siteId: u.site_id || undefined,
      smallGroupId: u.small_group_id || undefined,
      mandateStartDate: u.mandate_start_date || undefined,
      mandateEndDate: u.mandate_end_date || undefined,
      createdAt: u.created_at || undefined,
    })) ?? [];
  },

  /**
   * Permanently deletes a user.
   */
  async deleteUser(userId: string): Promise<void> {
    const supabase = await getSupabase();
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

    const supabase = await getSupabase();
    const { data, error } = await supabase.from('profiles').select('*').in('id', userIds);

    if (error) {
      console.error('[ProfileService] Error in getUsersByIds:', error.message);
      throw new Error(error.message);
    }

    // Direct mapping to avoid recursion
    return (data as any[]).map(u => ({
      id: u.id,
      name: u.name || '',
      email: u.email || '',
      role: u.role as any,
      status: u.status as any,
      siteId: u.site_id || undefined,
      smallGroupId: u.small_group_id || undefined,
      mandateStartDate: u.mandate_start_date || undefined,
      mandateEndDate: u.mandate_end_date || undefined,
      createdAt: u.created_at || undefined,
    })) ?? [];
  },
};

export { profileService };
