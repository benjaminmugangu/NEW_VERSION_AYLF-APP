// src/contexts/AuthContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import type { User } from "@/lib/types";

interface AuthContextType {
  currentUser: User | null;
  session: any | null;
  isLoading: boolean;
  authError: { code: string; message: string; details?: any } | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user: kindeUser, isLoading: isKindeLoading } = useKindeBrowserClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<{ code: string; message: string; details?: any } | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);

  const fetchUserProfile = React.useCallback(async (isManualRefresh = false) => {
    if (!kindeUser) {
      setCurrentUser(null);
      setAuthError(null);
      setIsAppLoading(false);
      return;
    }

    if (isManualRefresh) setIsAppLoading(true);

    try {
      const res = await fetch('/api/auth/me', {
        cache: 'no-store',
        headers: { 'x-refresh': Date.now().toString() } // Prevent any potential browser caching
      });

      if (!res.ok) {
        const text = await res.text();
        setAuthError({
          code: `HTTP_${res.status}`,
          message: `Server returned ${res.status}: ${res.statusText}`,
          details: {
            status: res.status,
            snippet: text.substring(0, 200)
          }
        });
        setCurrentUser(null);
        return;
      }

      const data = await res.json();
      setCurrentUser(data.user);
      setAuthError(null);
    } catch (error: any) {
      console.error("Error syncing user profile:", error);
      setAuthError({
        code: 'FETCH_FAILED',
        message: error.message || 'Network error fetching profile',
        details: { raw: error.toString() }
      });
      setCurrentUser(null);
    } finally {
      setIsAppLoading(false);
    }
  }, [kindeUser]);

  useEffect(() => {
    if (!isKindeLoading) {
      fetchUserProfile();
    }
  }, [fetchUserProfile, isKindeLoading]);

  const value = {
    currentUser,
    session: null,
    isLoading: isKindeLoading || isAppLoading,
    authError,
    refreshUser: () => fetchUserProfile(true)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useCurrentUser = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useCurrentUser must be used within an AuthProvider');
  }
  return context;
};
