// src/app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton"; // Or a more sophisticated loader

export default function HomePage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (currentUser) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || (!currentUser && typeof window !== 'undefined' && window.location.pathname !== '/login') || (currentUser && typeof window !== 'undefined' && window.location.pathname !== '/dashboard')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-1/2" />
        </div>
      </div>
    );
  }

  return null; // Or some fallback content if needed before redirect
}
