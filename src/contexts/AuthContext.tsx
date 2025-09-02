// src/contexts/AuthContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { profileService } from "@/services/profileService";
import type { User, UserRole } from "@/lib/types";

interface AuthContextType {
  currentUser: User | null;
  session: Session | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createSupabaseBrowserClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const updateUserAndSession = async (session: Session | null) => {
      if (!isMounted) return;
      
      setSession(session);
      if (session?.user) {
        try {
          const profile = await profileService.getProfile(session.user.id);
          if (!isMounted) return;
          
          if (profile && session.user.email) {
            const user: User = {
              // Base from Supabase Auth
              id: session.user.id,
              email: session.user.email,
              app_metadata: session.user.app_metadata,
              user_metadata: session.user.user_metadata,
              aud: session.user.aud,
              createdAt: session.user.created_at,
              // Enriched from our 'profiles' table
              name: profile.name,
              role: profile.role,
              siteId: profile.siteId,
              smallGroupId: profile.smallGroupId,
              mandateStartDate: profile.mandateStartDate,
              mandateEndDate: profile.mandateEndDate,
              status: profile.status,
            };
            setCurrentUser(user);
          } else {
            setCurrentUser(null);
          }
        } catch (error) {
          if (!isMounted) return;
          console.error('Failed to fetch user profile:', error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      if (isMounted) {
        setIsLoading(false);
      }
    };

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await updateUserAndSession(session);
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      await updateUserAndSession(session);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    session,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
