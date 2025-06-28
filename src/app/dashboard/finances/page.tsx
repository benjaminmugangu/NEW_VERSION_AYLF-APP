"use client";

import React, { useState } from 'react';
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { useFinancials } from "@/hooks/useFinancials";
import FinancialDashboard from "./components/FinancialDashboard";
import { DateRangeFilter, type DateFilterValue } from "@/components/shared/DateRangeFilter"; // Corrected import path
import { Skeleton } from "@/components/ui/skeleton";
import { NewTransactionModal } from "./components/NewTransactionModal";

// Skeleton component for loading state
const FinancesPageSkeleton = () => (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-[126px]" />
      <Skeleton className="h-[126px]" />
      <Skeleton className="h-[126px]" />
      <Skeleton className="h-[126px]" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Skeleton className="col-span-4 h-[300px]" />
        <Skeleton className="col-span-3 h-[300px]" />
    </div>
  </div>
);

export default function FinancesPage() {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });
  const { stats, isLoading, currentUser } = useFinancials(dateFilter);

  const handleFilterChange = (filterValue: DateFilterValue) => {
    setDateFilter(filterValue);
  };

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Suivi des Finances</h2>
          <div className="flex items-center space-x-2">
            <DateRangeFilter onFilterChange={handleFilterChange} />
            <NewTransactionModal />
          </div>
        </div>
        {isLoading ? (
          <FinancesPageSkeleton />
        ) : (
          <FinancialDashboard stats={stats} currentUser={currentUser} />
        )}
      </div>
    </RoleBasedGuard>
  );
}
