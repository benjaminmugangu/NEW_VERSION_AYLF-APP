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
      return { success: false, error: { message: e.message || 'An unexpected error occurred.' } };
    }
  },

  // Met à jour le profil d'un utilisateur
  async updateProfile(userId: string, updates: Partial<User>): Promise<ServiceResponse<User>> {
     try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {

        return { success: false, error: { message: error.message } };
      }

      return { success: true, data: data as User };
    } catch (e: any) {

      return { success: false, error: { message: e.message || 'An unexpected error occurred.' } };
    }
  },

  // Récupère tous les profils utilisateurs
  async getUsers(): Promise<ServiceResponse<User[]>> {
    try {
      const { data, error } = await supabase.from('profiles').select('*');

      if (error) {
        return { success: false, error: { message: error.message } };
      }

      return { success: true, data: data as User[] };
    } catch (e: any) {
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

      const roleFilter = [
        `role.eq.${'NATIONAL_COORDINATOR'}`,
        `and(role.eq.${'SITE_COORDINATOR'},site_id.eq.${siteId})`,
        `and(role.eq.${'SMALL_GROUP_LEADER'},or(small_group_id.is.null,small_group_id.eq.${smallGroupId || ''}))`
      ].join(',');

      query = query.or(roleFilter);

      const { data, error } = await query;

      if (error) {
        return { success: false, error: { message: error.message } };
      }

      return { success: true, data: data as User[] };
    } catch (e: any) {
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
        return { success: false, error: { message: error.message } };
      }

      return { success: true, data: data as User[] };
    } catch (e: any) {
      return { success: false, error: { message: e.message || 'An unexpected error occurred.' } };
    }
  },
};

export { profileService };
