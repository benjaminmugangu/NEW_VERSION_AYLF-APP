// src/services/profileService.ts
import { createClient } from '@/utils/supabase/client';
import type { User } from '@/lib/types';

const profileService = {
  async getProfile(userId: string): Promise<User> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`*, site:site_id(name), small_group:small_group_id(name)`)
        .eq('id', userId)
        .single();

      if (error) throw new Error(error.message);
      if (!data) throw new Error('Profile not found.');

      return {
        ...data,
        siteName: data.site?.name || 'N/A',
        smallGroupName: data.small_group?.name || 'N/A',
      } as User;
    } catch (e: any) {
      console.error('[ProfileService] Unexpected error in getProfile:', e.message);
      throw new Error(e.message || 'An unexpected error occurred.');
    }
  },

  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    const supabase = createClient();
    try {
      const { role, mandateStartDate, mandateEndDate, siteId, smallGroupId, ...rest } = updates;
      const dbUpdates: { [key: string]: any } = { ...rest };

      if (role === 'national_coordinator') {
        dbUpdates.site_id = null;
        dbUpdates.small_group_id = null;
      } else if (role === 'site_coordinator') {
        dbUpdates.small_group_id = null;
      } else {
        if (siteId !== undefined) dbUpdates.site_id = siteId;
        if (smallGroupId !== undefined) dbUpdates.small_group_id = smallGroupId;
      }

      if (mandateStartDate !== undefined) dbUpdates.mandate_start_date = mandateStartDate;
      if (mandateEndDate !== undefined) dbUpdates.mandate_end_date = mandateEndDate;

      const { data, error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return data as User;
    } catch (e: any) {
      console.error('[ProfileService] Unexpected error in updateProfile:', e.message);
      throw new Error(e.message || 'An unexpected error occurred.');
    }
  },

  async getUsers(): Promise<User[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.rpc('get_users_with_details');
      if (error) throw new Error(error.message);
      return (data as User[]) || [];
    } catch (e: any) {
      console.error('[ProfileService] Unexpected error in getUsers:', e.message);
      throw new Error(e.message || 'An unexpected error occurred.');
    }
  },

  async getEligiblePersonnel(siteId: string, smallGroupId?: string): Promise<User[]> {
    const supabase = createClient();
    try {
      let query = supabase.from('profiles').select('*').neq('status', 'inactive');
      const leaderFilterParts = ['small_group_id.is.null'];
      if (smallGroupId) leaderFilterParts.push(`small_group_id.eq.${smallGroupId}`);
      const roleFilter = [
        `role.eq.NATIONAL_COORDINATOR`,
        `and(role.eq.SITE_COORDINATOR,site_id.eq.${siteId})`,
        `and(role.eq.SMALL_GROUP_LEADER,or(${leaderFilterParts.join(',')}))`
      ].join(',');
      query = query.or(roleFilter);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data as User[]) || [];
    } catch (e: any) {
      console.error('[ProfileService] Unexpected error in getEligiblePersonnel:', e.message);
      throw new Error(e.message || 'An unexpected error occurred.');
    }
  },

  async deleteUser(userId: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.rpc('delete_user_permanently', { user_id: userId });
      if (error) throw new Error(error.message);
    } catch (e: any) {
      console.error('[ProfileService] Unexpected error in deleteUser:', e.message);
      throw new Error(e.message || 'An unexpected error occurred.');
    }
  },

  async getUsersByIds(userIds: string[]): Promise<User[]> {
    const supabase = createClient();
    if (!userIds || userIds.length === 0) return [];
    try {
      const { data, error } = await supabase.from('profiles').select('*').in('id', userIds);
      if (error) throw new Error(error.message);
      return (data as User[]) || [];
    } catch (e: any) {
      console.error('[ProfileService] Unexpected error in getUsersByIds:', e.message);
      throw new Error(e.message || 'An unexpected error occurred.');
    }
  },
};

export default profileService;
