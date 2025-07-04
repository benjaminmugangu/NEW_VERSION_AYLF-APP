"use client";

import React, { useState, useMemo } from 'react';
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { useFinancials } from "@/hooks/useFinancials";
import FinancialDashboard from "./components/FinancialDashboard";
import { DateRangeFilter, type DateFilterValue } from "@/components/shared/DateRangeFilter";
import { Skeleton } from "@/components/ui/skeleton";
import { NewAllocationModal } from "./components/NewAllocationModal";
import { AllocationList } from "./components/AllocationList";

const FinancesPageSkeleton = () => (
  <div className="space-y-4 p-4 md:p-8 pt-6">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-[126px]" />
      <Skeleton className="h-[126px]" />
      <Skeleton className="h-[126px]" />
      <Skeleton className="h-[126px]" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
      <div className="col-span-4">
        <Skeleton className="h-[350px]" />
      </div>
      <div className="col-span-3">
        <Skeleton className="h-[350px]" />
      </div>
    </div>
  </div>
);

export default function FinancesPage() {
  const { stats, isLoading, currentUser, dateFilter, setDateFilter, refetch } = useFinancials();

  if (isLoading) {
    return <FinancesPageSkeleton />;
  }

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Finances Dashboard</h2>
          <div className="flex items-center space-x-2">
            {currentUser?.role === ROLES.NATIONAL_COORDINATOR && <NewAllocationModal />} 
            <DateRangeFilter onFilterChange={setDateFilter} initialRangeKey={dateFilter.rangeKey} />
          </div>
        </div>
        <FinancialDashboard 
          stats={stats} 
          currentUser={currentUser} 
          linkGenerator={(type, id) => `/dashboard/finances/${type}/${id}`}
        />
      </div>
    </RoleBasedGuard>
  );
}