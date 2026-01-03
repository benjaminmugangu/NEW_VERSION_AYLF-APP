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
        const res = await fetch('/api/auth/me', { cache: 'no-store' });

        if (!res.ok) {
          const text = await res.text();
          if (isMounted) {
            setAuthError({
              code: `HTTP_${res.status}`,
              message: `Server returned ${res.status}: ${res.statusText}`,
              details: {
                status: res.status,
                snippet: text.substring(0, 200)
              }
            });
            setCurrentUser(null);
          }
          return;
        }

        let data;
        try {
          data = await res.json();
        } catch (e: any) {
          const text = await res.text().catch(() => 'Unavailable');
          if (isMounted) {
            setAuthError({
              code: 'INVALID_JSON',
              message: 'Failed to parse user profile',
              details: { error: e.message, snippet: text.substring(0, 200) }
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

export const useCurrentUser = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useCurrentUser must be used within an AuthProvider');
  }
  return context;
};
