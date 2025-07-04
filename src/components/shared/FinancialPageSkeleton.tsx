// src/components/shared/FinancialPageSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

interface FinancialPageSkeletonProps {
  statCardCount?: number;
}

export const FinancialPageSkeleton = ({ statCardCount = 3 }: FinancialPageSkeletonProps) => (
    <div className="space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-8 w-1/3 mt-2" />
        <Skeleton className="h-12 w-full mt-4" />
        <div className={`grid w-full grid-cols-2 md:grid-cols-${statCardCount} gap-4 mb-4 mt-4`}>
            {Array.from({ length: statCardCount }).map((_, i) => (
                <Skeleton key={i} className="h-28" />
            ))}
        </div>
        <Skeleton className="h-64 w-full" />
    </div>
);
