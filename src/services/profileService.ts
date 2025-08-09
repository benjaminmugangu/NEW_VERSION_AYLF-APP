// src/services/profileService.ts
import { supabase } from '@/lib/supabaseClient';
import type { User, ServiceResponse } from '@/lib/types';

const profileService = {
  // Récupère le profil d'un utilisateur à partir de son ID
  async getProfile(userId: string): Promise<ServiceResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *, 
          site:site_id(name),
          small_group:small_group_id(name)
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[ProfileService] Error in getProfile:', error.message);
        return { success: false, error: { message: error.message } };
      }

      if (!data) {
        return { success: false, error: { message: 'Profile not found.' } };
      }

      const userProfile: User = {
        ...data,
        siteName: data.site?.name || 'N/A',
        smallGroupName: data.small_group?.name || 'N/A',
      };

      return { success: true, data: userProfile };
    } catch (e: any) {
      console.error('[ProfileService] Unexpected error in getProfile:', e.message);
      return { success: false, error: { message: e.message || 'An unexpected error occurred.' } };
    }
  },

  // Met à jour le profil d'un utilisateur
      async updateProfile(userId: string, updates: Partial<User>): Promise<ServiceResponse<User>> {
     try {
      const { role } = updates;

      // Enforce business logic for assignments based on role
      if (role === 'national_coordinator') {
        updates.siteId = null;
        updates.smallGroupId = null;
      } else if (role === 'site_coordinator') {
        updates.smallGroupId = null;
      }

      // Map camelCase to snake_case for DB
      const { mandateStartDate, mandateEndDate, siteId, smallGroupId, ...rest } = updates;
      const dbUpdates: { [key: string]: any } = { ...rest };

      if (mandateStartDate !== undefined) dbUpdates.mandate_start_date = mandateStartDate;
      if (mandateEndDate !== undefined) dbUpdates.mandate_end_date = mandateEndDate;
      if (siteId !== undefined) dbUpdates.site_id = siteId;
      if (smallGroupId !== undefined) dbUpdates.small_group_id = smallGroupId;

      const { data, error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('[ProfileService] Error in updateProfile:', error.message);
        return { success: false, error: { message: error.message } };
      }

      return { success: true, data: data as User };
    } catch (e: any) {
      console.error('[ProfileService] Unexpected error in updateProfile:', e.message);
      return { success: false, error: { message: e.message || 'An unexpected error occurred.' } };
    }
  },

  // Récupère tous les profils utilisateurs avec les détails d'affectation
  async getUsers(): Promise<ServiceResponse<User[]>> {
    try {
      const { data, error } = await supabase.rpc('get_users_with_details');

      if (error) {
        console.error('[ProfileService] Error in getUsers:', error.message);
        return { success: false, error: { message: error.message } };
      }

      return { success: true, data: data as User[] };
    } catch (e: any) {
      console.error('[ProfileService] Unexpected error in getUsers:', e.message);
      return { success: false, error: { message: e.message || 'An unexpected error occurred.' } };
    }
  },

  // Récupère les utilisateurs éligibles pour les rôles de direction de petits groupes
  async getEligiblePersonnel(siteId: string, smallGroupId?: string): Promise<ServiceResponse<User[]>> {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .neq('status', 'inactive');

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
        return { success: false, error: { message: error.message } };
      }

      return { success: true, data: data as User[] };
    } catch (e: any) {
      console.error('[ProfileService] Unexpected error in getEligiblePersonnel:', e.message);
      return { success: false, error: { message: e.message || 'An unexpected error occurred.' } };
    }
  },

  // Supprime définitivement un utilisateur
  async deleteUser(userId: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase.rpc('delete_user_permanently', { user_id: userId });

      if (error) {
        console.error('[ProfileService] Error in deleteUser:', error.message);
        return { success: false, error: { message: error.message } };
      }

      return { success: true, data: null };
    } catch (e: any) {
      console.error('[ProfileService] Unexpected error in deleteUser:', e.message);
      return { success: false, error: { message: e.message || 'An unexpected error occurred.' } };
    }
  },

  // Récupère plusieurs profils utilisateurs par leurs IDs
  async getUsersByIds(userIds: string[]): Promise<ServiceResponse<User[]>> {
    if (!userIds || userIds.length === 0) {
      return { success: true, data: [] };
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (error) {
        console.error('[ProfileService] Error in getUsersByIds:', error.message);
        return { success: false, error: { message: error.message } };
      }

      return { success: true, data: data as User[] };
    } catch (e: any) {
      console.error('[ProfileService] Unexpected error in getUsersByIds:', e.message);
      return { success: false, error: { message: e.message || 'An unexpected error occurred.' } };
    }
  },
};

export { profileService };
