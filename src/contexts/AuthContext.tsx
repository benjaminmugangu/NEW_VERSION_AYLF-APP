// src/contexts/AuthContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import type { User } from "@/lib/types";

interface AuthContextType {
  currentUser: User | null;
  session: any | null; // Gardé pour compatibilité temporaire, mais sera null
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user: kindeUser, isLoading: isKindeLoading } = useKindeBrowserClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchUserProfile = async () => {
      if (!kindeUser) {
        setCurrentUser(null);
        setIsAppLoading(false);
        return;
      }

      try {
        // On appelle notre API interne qui fait le pont Kinde -> DB Prisma
        const res = await fetch('/api/auth/me');
        if (!res.ok) throw new Error('Failed to fetch user profile');
        
        const data = await res.json();
        
        if (isMounted) {
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error("Error syncing user profile:", error);
        if (isMounted) setCurrentUser(null);
      } finally {
        if (isMounted) setIsAppLoading(false);
      }
    };

    if (!isKindeLoading) {
        fetchUserProfile();
    }
  }, [kindeUser, isKindeLoading]);

  const value = {
    currentUser,
    session: null, // Plus de session Supabase
    isLoading: isKindeLoading || isAppLoading,
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
