// src/contexts/AuthContext.tsx
"use client";

import type { User } from "@/lib/types";
import React, { createContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from '@/lib/supabaseClient';
import profileService from '@/services/profileService';
import { Session } from "@supabase/supabase-js";

interface AuthContextType {
  currentUser: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Marquer le chargement initial comme terminé une fois que la première vérification de session est faite.
    // Cela évite un écran de chargement vide au démarrage.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        profileService.getProfile(session.user.id).then(({ data: profile, success }) => {
          if (success && profile) {
            setCurrentUser(profile);
          }
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // Le listener onAuthStateChange gère désormais TOUS les changements d'état d'authentification (login, logout, token refresh, etc.)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const { data: profile, success } = await profileService.getProfile(session.user.id);
        if (success && profile) {
          setCurrentUser(profile);
        } else {
          // Si l'utilisateur existe dans Supabase Auth mais pas dans nos profils, on le déconnecte ou on le traite comme non authentifié.
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      // On ne modifie plus isLoading ici pour éviter les rechargements d'UI.
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

    const login = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSession(null);
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

