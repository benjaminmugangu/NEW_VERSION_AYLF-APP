// src/contexts/AuthContext.tsx
"use client";

import type { User, AuthContextType } from "@/lib/types";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from '@/lib/supabaseClient';
import authService from '@/services/auth.service';
import { Session } from "@supabase/supabase-js";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null); // Keep session for other potential uses
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for an existing session on initial load
    const checkCurrentUser = async () => {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      // Also get the session if needed, though currentUser is primary
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setIsLoading(false);
    };

    checkCurrentUser();

    // Listen for auth state changes (e.g., logout from another tab)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          const user = await authService.getCurrentUser();
          setCurrentUser(user);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await authService.login({ email, password });
      setCurrentUser(user);
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    } catch (error) {
      // Re-throw the error to be handled by the UI component (e.g., the login form)
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during logout';
      console.error('[AuthContext] Logout failed but clearing session locally:', errorMessage);
    } finally {
      setCurrentUser(null);
      setSession(null);
      setIsLoading(false);
    }
  };

  const value = {
    currentUser,
    session,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

