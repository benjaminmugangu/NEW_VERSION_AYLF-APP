// src/components/shared/skeletons/SiteDetailSkeleton.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building } from "lucide-react";

export function SiteDetailSkeleton() {
  return (
    <div>
      {/* PageHeader Skeleton */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-1 min-w-0 items-center gap-3">
            <Building className="h-8 w-8 text-primary shrink-0" />
            <div className="min-w-0">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-64 mt-2" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0 md:ml-auto shrink-0">
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>

      {/* StatCards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/4 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/4 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/4 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>

      {/* Table Skeleton */}
      <Card className="shadow-lg">
        <CardHeader>
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-4 mt-2 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
            <div className="flex justify-between items-center p-2">
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-5 w-1/6" />
                <Skeleton className="h-5 w-1/6" />
            </div>
            {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between items-center p-2 border-t">
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-6 w-1/6" />
                    <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
