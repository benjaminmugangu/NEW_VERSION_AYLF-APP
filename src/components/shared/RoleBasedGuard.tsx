// src/components/shared/RoleBasedGuard.tsx
"use client";

import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/lib/types";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button"; // Added import for Button

interface RoleBasedGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
  fallbackPath?: string; // Path to redirect if role not allowed
  showForbiddenMessage?: boolean; // Whether to show a message or just redirect
}

export function RoleBasedGuard({
  allowedRoles,
  children,
  fallbackPath = "/dashboard", // Default to dashboard, can be /login if preferred
  showForbiddenMessage = true,
}: RoleBasedGuardProps) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && currentUser && !allowedRoles.includes(currentUser.role)) {
      if (!showForbiddenMessage) { // Only redirect if not showing message
        router.replace(fallbackPath);
      }
    }
    // If not logged in and not loading, redirect to login.
    // This handles cases where a user tries to access a protected page directly.
    if (!isLoading && !currentUser) {
        router.replace("/login");
    }
  }, [currentUser, isLoading, allowedRoles, router, fallbackPath, showForbiddenMessage]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-1/2" />
      </div>
    );
  }

  if (currentUser && allowedRoles.includes(currentUser.role)) {
    return <>{children}</>;
  }
  
  if (currentUser && !allowedRoles.includes(currentUser.role) && showForbiddenMessage) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h2 className="text-2xl font-semibold text-destructive mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
        <Button onClick={() => router.push(fallbackPath || "/dashboard")} className="mt-4">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  // If not logged in (and not loading), this will be handled by redirect,
  // but returning null prevents flicker or rendering unauthorized content briefly.
  return null; 
}
