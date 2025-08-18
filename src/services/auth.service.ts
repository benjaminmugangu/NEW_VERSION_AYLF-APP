// src/services/auth.service.ts
'use client';

import { createClient } from '@/utils/supabase/client';
import type { User, LoginCredentials } from '@/lib/types';
import profileService from './profileService';

const authService = {
  login: async (credentials: LoginCredentials): Promise<User> => {
    if (!credentials.password) {
      throw new Error('Password is required.');
    }
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (authError) {
      console.error('[AuthService] Error in login (auth):', authError.message);
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('Authentication failed, user not found.');
    }

    try {
      const userProfile = await profileService.getProfile(authData.user.id);
      return userProfile as User;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[AuthService] Error in login (profile fetch):', errorMessage);
      await supabase.auth.signOut();
      throw new Error('User profile not found after login.');
    }
  },

  logout: async (): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[AuthService] Error in logout:', error.message);
      throw new Error(error.message);
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[AuthService] Error fetching session:', sessionError.message);
        return null;
      }

      if (session?.user) {
        try {
          const userProfile = await profileService.getProfile(session.user.id);
          return userProfile as User | null;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[AuthService] Failed to fetch profile for current user:', errorMessage);
          return null;
        }
      }

      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('[AuthService] Unexpected error in getCurrentUser:', errorMessage);
      return null;
    }
  },
};

export default authService;
