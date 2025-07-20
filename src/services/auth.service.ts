// src/services/auth.service.ts
'use client';

import { supabase } from '@/lib/supabaseClient';
import type { User, LoginCredentials, ServiceResponse } from '@/lib/types';
import { profileService } from './profileService';

const authService = {
  login: async (credentials: LoginCredentials): Promise<ServiceResponse<User>> => {
    if (!credentials.password) {
      return { success: false, error: { message: 'Password is required.' } };
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (authError) {
      return { success: false, error: { message: authError.message } };
    }

    if (!authData.user) {
      return { success: false, error: { message: 'Authentication failed, user not found.' } };
    }

    // After successful login, fetch the user's profile to get role and other details
    const profileResponse = await profileService.getProfile(authData.user.id);

    if (!profileResponse.success) {
      // If profile doesn't exist, it's a critical issue. Log out to be safe.
      await supabase.auth.signOut();
      return { success: false, error: { message: 'User profile not found after login.' } };
    }

    return { success: true, data: profileResponse.data! };
  },

  logout: async (): Promise<ServiceResponse<{}>> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: { message: error.message } };
    }
    return { success: true, data: {} };
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {

        return null;
      }

      if (session?.user) {
        const profileResponse = await profileService.getProfile(session.user.id);
        if (profileResponse.success) {
          return profileResponse.data || null;
        }
        // If profile fetch fails, the user is authenticated but their app data is missing.
        // This is a problematic state. For now, we return null.

        return null;
      }

      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

      return null;
    }
  },
};

export default authService;
