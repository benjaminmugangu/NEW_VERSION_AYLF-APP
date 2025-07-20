// src/components/shared/skeletons/MemberDetailSkeleton.tsx
import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function MemberDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="items-center text-center">
            <Skeleton className="h-24 w-24 rounded-full mb-4" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-24 mt-1" />
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <div className="flex items-center">
              <Skeleton className="h-4 w-4 mr-3" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="flex items-center">
              <Skeleton className="h-4 w-4 mr-3" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="flex items-center">
              <Skeleton className="h-4 w-4 mr-3" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2 space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-7 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start">
              <Skeleton className="h-5 w-5 mr-3 mt-0.5" />
              <div className="w-full space-y-1">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            </div>
            <div className="flex items-start">
              <Skeleton className="h-5 w-5 mr-3 mt-0.5" />
              <div className="w-full space-y-1">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-full mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border-b pb-3 last:border-b-0">
                <Skeleton className="h-5 w-2/3 mb-1" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
