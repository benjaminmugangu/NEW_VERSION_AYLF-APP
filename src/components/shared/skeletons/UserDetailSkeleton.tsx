// src/components/shared/skeletons/UserDetailSkeleton.tsx
import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function UserDetailSkeleton() {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-5 w-3/4 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center">
            <Skeleton className="h-5 w-5 mr-3" />
            <Skeleton className="h-5 w-full" />
          </div>
          <div className="flex items-center">
            <Skeleton className="h-5 w-5 mr-3" />
            <Skeleton className="h-5 w-1/3" />
          </div>
          <div className="flex items-center">
            <Skeleton className="h-5 w-5 mr-3" />
            <Skeleton className="h-5 w-1/4" />
          </div>
          <div className="flex items-center">
            <Skeleton className="h-5 w-5 mr-3" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center">
            <Skeleton className="h-5 w-5 mr-3" />
            <div className="w-full">
              <Skeleton className="h-5 w-1/4 mb-1" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="flex items-center">
            <Skeleton className="h-5 w-5 mr-3" />
            <div className="w-full">
              <Skeleton className="h-5 w-1/4 mb-1" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
