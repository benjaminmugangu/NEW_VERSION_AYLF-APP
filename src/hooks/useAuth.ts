// src/hooks/useAuth.ts
'use client';

import { useQuery } from '@tanstack/react-query';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: string;
    siteId?: string | null;
    smallGroupId?: string | null;
}

/**
 * Hook to get the current authenticated user
 */
export function useAuth() {
    const { data: currentUser, isLoading } = useQuery<AuthUser | null>({
        queryKey: ['currentUser'],
        queryFn: async () => {
            const res = await fetch('/api/auth/me');
            if (!res.ok) return null;
            return res.json();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return {
        currentUser,
        isLoading,
        isAuthenticated: !!currentUser,
    };
}
