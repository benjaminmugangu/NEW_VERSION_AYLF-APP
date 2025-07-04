// src/services/profileService.ts
import { supabase } from '@/lib/supabaseClient';
import { User } from '@/lib/types';
import { ServiceResponse } from '@/lib/types';

const profileService = {
  // Récupère le profil d'un utilisateur à partir de son ID
  async getProfile(userId: string): Promise<ServiceResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error.message);
        return { success: false, error: { message: error.message } };
      }

      if (!data) {
        return { success: false, error: { message: 'Profile not found.' } };
      }

      // Ici, nous pourrions avoir besoin de mapper les champs de la BDD (snake_case)
      // vers notre modèle de type User (camelCase), si ce n'est pas déjà aligné.
      // Pour l'instant, on suppose un mappage direct.
      const userProfile: User = data as User;

      return { success: true, data: userProfile };
    } catch (e: any) {
      console.error('Unexpected error in getProfile:', e.message);
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
        console.error('Error updating profile:', error.message);
        return { success: false, error: { message: error.message } };
      }

      return { success: true, data: data as User };
    } catch (e: any) {
      console.error('Unexpected error in updateProfile:', e.message);
      return { success: false, error: { message: e.message || 'An unexpected error occurred.' } };
    }
  }
};

export default profileService;
