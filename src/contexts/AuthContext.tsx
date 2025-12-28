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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user: kindeUser, isLoading: isKindeLoading } = useKindeBrowserClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<{ code: string; message: string; details?: any } | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchUserProfile = async () => {
      if (!kindeUser) {
        setCurrentUser(null);
        setAuthError(null);
        setIsAppLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' }); // Disable cache to prevent stale auth data
        const data = await res.json();

        if (!res.ok) {
          if (isMounted) {
            setAuthError({
              code: data.code || 'UNKNOWN_ERROR',
              message: data.error || 'Failed to fetch profile',
              details: { ...data.details, status: res.status }
            });
            setCurrentUser(null);
          }
          return;
        }

        if (isMounted) {
          setCurrentUser(data.user);
          setAuthError(null);
        }
      } catch (error: any) {
        console.error("Error syncing user profile:", error);
        if (isMounted) {
          setAuthError({
            code: 'FETCH_FAILED',
            message: error.message || 'Network error fetching profile',
            details: {
              raw: error.toString(),
              stack: error.stack
            }
          });
          setCurrentUser(null);
        }
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
    session: null,
    isLoading: isKindeLoading || isAppLoading,
    authError
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
